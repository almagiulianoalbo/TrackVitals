import { NextResponse } from "next/server";
import { getConversationSummary, generateConversationSummary } from "@/lib/conversation-summaries";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "medico") {
    return jsonError("Solo los médicos pueden ver el resumen clínico de conversación.", 403);
  }

  const patientId = getPatientIdFromRequest(request);

  if (!patientId) {
    return jsonError("Seleccioná una conversación válida.");
  }

  try {
    const validRelation = await validateDoctorPatientRelation(user.userId, patientId);

    if (!validRelation) {
      return jsonError("No se pudo validar el paciente.", 403);
    }

    const summary = await getConversationSummary(user.userId, patientId);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error(error);
    return jsonError(getConversationSummaryErrorMessage(error, "cargar"), 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "medico") {
    return jsonError("Solo los médicos pueden generar el resumen clínico de conversación.", 403);
  }

  const body = await request.json().catch(() => null);
  const patientId = cleanRequiredNumber(body?.contacto_id ?? body?.patientId);

  if (!patientId) {
    return jsonError("Seleccioná una conversación válida.");
  }

  try {
    const validRelation = await validateDoctorPatientRelation(user.userId, patientId);

    if (!validRelation) {
      return jsonError("No se pudo validar el paciente.", 403);
    }

    const summary = await generateConversationSummary(user.userId, patientId);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error(error);
    return jsonError(getConversationSummaryErrorMessage(error, "generar"), 500);
  }
}

async function validateDoctorPatientRelation(doctorId: number, patientId: number) {
  const { data, error } = await getSupabaseAdmin()
    .from("pacientes")
    .select("id_paciente")
    .eq("id_paciente", patientId)
    .eq("id_medico_cabecera", doctorId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }

  return Boolean(data);
}

function getPatientIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return cleanRequiredNumber(url.searchParams.get("contacto_id") ?? url.searchParams.get("patientId"));
}

function cleanRequiredNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function getConversationSummaryErrorMessage(error: unknown, action: "cargar" | "generar") {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Falta MONGODB_URI")) {
    return "Falta configurar MONGODB_URI para guardar el resumen clínico.";
  }

  if (
    message.includes("SSL") ||
    message.includes("TLS") ||
    message.includes("ServerSelection") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT")
  ) {
    return "MongoDB Atlas rechazó la conexión. Revisá Network Access/IP allowlist en Atlas y que el cluster permita conexiones desde esta red.";
  }

  return `No se pudo ${action} el resumen clínico.`;
}
