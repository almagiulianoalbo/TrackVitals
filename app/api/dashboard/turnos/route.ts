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

  const fechaHora = cleanString(body.fecha_hora);
  const motivo = cleanString(body.motivo);

  if (!fechaHora || !motivo) {
    return jsonError("La fecha, hora y motivo son obligatorios.");
  }

  try {
    const supabase = getSupabaseAdmin();

    if (user.role === "medico") {
      const idPaciente = cleanRequiredNumber(body.id_paciente);

      if (!idPaciente) {
        return jsonError("Seleccioná un paciente.");
      }

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
        .from("turnos")
        .insert({
          id_paciente: idPaciente,
          id_medico: user.userId,
          fecha_hora: fechaHora,
          motivo,
          estado: "pendiente"
        })
        .select("id_turno")
        .single();

      if (error) {
        console.error(error);
        return jsonError("No se pudo crear el turno.", 500);
      }

      return NextResponse.json({ message: "Turno creado correctamente.", record: data });
    }

    const { data: patient, error: patientError } = await supabase
      .from("pacientes")
      .select("id_medico_cabecera")
      .eq("id_paciente", user.userId)
      .maybeSingle();

    if (patientError) {
      console.error(patientError);
      return jsonError("No se pudo buscar el médico de cabecera.", 500);
    }

    if (!patient?.id_medico_cabecera) {
      return jsonError("No tenés un médico de cabecera asignado para pedir turno.");
    }

    const { data, error } = await supabase
      .from("turnos")
      .insert({
        id_paciente: user.userId,
        id_medico: patient.id_medico_cabecera,
        fecha_hora: fechaHora,
        motivo,
        estado: "pendiente"
      })
      .select("id_turno")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo pedir el turno.", 500);
    }

    return NextResponse.json({ message: "Turno pedido correctamente.", record: data });
  } catch (error) {
    console.error(error);
    return jsonError(user.role === "medico" ? "No se pudo crear el turno." : "No se pudo pedir el turno.", 500);
  }
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
