import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "medico") {
    return jsonError("Solo los médicos pueden crear prescripciones.", 403);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos.");
  }

  const idPaciente = cleanRequiredNumber(body.id_paciente);
  const medicamento = cleanString(body.medicamento);
  const dosis = cleanNumber(body.dosis);
  const unidad = cleanString(body.unidad);
  const frecuencia = cleanString(body.frecuencia);

  if (!idPaciente) {
    return jsonError("Seleccioná un paciente.");
  }

  if (!medicamento || dosis === null || !unidad || !frecuencia) {
    return jsonError("Completá medicamento, dosis, unidad y frecuencia.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: patient, error: patientError } = await supabase
      .from("pacientes")
      .select("id_paciente")
      .eq("id_paciente", idPaciente)
      .eq("id_medico_cabecera", user.userId)
      .maybeSingle();

    if (patientError) {
      console.error(patientError);
      return jsonError("No se pudo validar el paciente.", 500);
    }

    if (!patient) {
      return jsonError("El paciente seleccionado no está vinculado a tu cuenta.", 403);
    }

    const { data, error } = await supabase
      .from("prescripciones")
      .insert({
        id_paciente: idPaciente,
        id_medico: user.userId,
        titulo: medicamento,
        medicamento,
        dosis,
        unidad,
        frecuencia,
        fecha_inicio: cleanString(body.fecha_inicio),
        fecha_fin: cleanString(body.fecha_fin),
        estado: cleanString(body.estado) ?? "activa",
        indicaciones: cleanString(body.indicaciones)
      })
      .select("id_prescripcion")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo crear la prescripción.", 500);
    }

    return NextResponse.json({ message: "Prescripción creada correctamente.", record: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear la prescripción.", 500);
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanRequiredNumber(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue) return null;
  const numberValue = Number(cleanValue);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function cleanNumber(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue) return null;
  const numberValue = Number(cleanValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}
