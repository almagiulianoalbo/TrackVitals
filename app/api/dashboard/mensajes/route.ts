import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos.");
  }

  const contactId = cleanRequiredNumber(body.contacto_id);
  const content = cleanString(body.contenido);
  const category = cleanString(body.categoria) ?? "Consulta";

  if (!contactId) {
    return jsonError("Seleccioná una conversación.");
  }

  if (!content) {
    return jsonError("Escribí un mensaje.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const relation = await resolveRelation(user.role, user.userId, contactId);

    if (!relation) {
      return jsonError("No se pudo validar el contacto.", 403);
    }

    const { data, error } = await supabase
      .from("mensajes")
      .insert({
        id_paciente: relation.patientId,
        id_medico: relation.doctorId,
        remitente: user.role,
        asunto: category,
        contenido: content,
        leido: false,
        fecha_hora: toSupabaseTimestamp(new Date())
      })
      .select("id_mensaje")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo enviar el mensaje.", 500);
    }

    return NextResponse.json({ message: "Mensaje enviado.", record: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo enviar el mensaje.", 500);
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  const body = await request.json().catch(() => null);
  const contactId = cleanRequiredNumber(body?.contacto_id);

  if (!contactId) {
    return jsonError("Seleccioná una conversación.");
  }

  try {
    const relation = await resolveRelation(user.role, user.userId, contactId);

    if (!relation) {
      return jsonError("No se pudo validar el contacto.", 403);
    }

    const { error } = await getSupabaseAdmin()
      .from("mensajes")
      .update({ leido: true })
      .eq("id_paciente", relation.patientId)
      .eq("id_medico", relation.doctorId)
      .neq("remitente", user.role)
      .eq("leido", false);

    if (error) {
      console.error(error);
      return jsonError("No se pudieron marcar los mensajes como leídos.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudieron marcar los mensajes como leídos.", 500);
  }
}

async function resolveRelation(role: "paciente" | "medico", userId: number, contactId: number) {
  const supabase = getSupabaseAdmin();

  if (role === "medico") {
    const { data, error } = await supabase
      .from("pacientes")
      .select("id_paciente,id_medico_cabecera")
      .eq("id_paciente", contactId)
      .eq("id_medico_cabecera", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data ? { patientId: Number(data.id_paciente), doctorId: userId } : null;
  }

  const { data, error } = await supabase
    .from("pacientes")
    .select("id_paciente,id_medico_cabecera")
    .eq("id_paciente", userId)
    .eq("id_medico_cabecera", contactId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data?.id_medico_cabecera ? { patientId: userId, doctorId: Number(data.id_medico_cabecera) } : null;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanRequiredNumber(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue && typeof value !== "number") return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
