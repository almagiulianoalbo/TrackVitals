import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90
};

export async function GET(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "medico") {
    return jsonError("Solo los médicos pueden ver este resumen.", 403);
  }

  const url = new URL(request.url);
  const patientId = Number(url.searchParams.get("id_paciente"));
  const range = url.searchParams.get("rango") ?? "7d";
  const days = RANGE_DAYS[range] ?? RANGE_DAYS["7d"];

  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return jsonError("Paciente inválido.");
  }

  try {
    const supabase = getSupabaseAdmin();

    const [{ data: patient, error: patientError }, { data: latestRecord, error: latestRecordError }] = await Promise.all([
      supabase
        .from("pacientes")
        .select("id_paciente,nombre,apellido,email,telefono,fecha_nacimiento,tipo_diabetes")
        .eq("id_paciente", patientId)
        .eq("id_medico_cabecera", user.userId)
        .maybeSingle(),
      supabase
        .from("registros_diarios")
        .select("fecha_hora")
        .eq("id_paciente", patientId)
        .order("fecha_hora", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (patientError) {
      console.error(patientError);
      return jsonError("No se pudo buscar el paciente.", 500);
    }

    if (!patient) {
      return jsonError("El paciente no está vinculado a tu cuenta.", 404);
    }

    if (latestRecordError) {
      console.error(latestRecordError);
      return jsonError("No se pudo buscar el último registro del paciente.", 500);
    }

    if (!latestRecord?.fecha_hora) {
      return NextResponse.json({
        patient,
        range,
        anchorDate: null,
        records: []
      });
    }

    const anchorDate = new Date(latestRecord.fecha_hora);
    const since = toSupabaseTimestamp(new Date(anchorDate.getTime() - days * 24 * 60 * 60 * 1000));
    const until = toSupabaseTimestamp(anchorDate);

    const { data: records, error: recordsError } = await supabase
      .from("registros_diarios")
      .select("id_registro,fecha_hora,momento,glucemia_mgdl,carbohidratos_g,tipo_insulina,dosis_unidades")
      .eq("id_paciente", patientId)
      .gte("fecha_hora", since)
      .lte("fecha_hora", until)
      .order("fecha_hora", { ascending: true });

    if (recordsError) {
      console.error(recordsError);
      return jsonError("No se pudieron buscar los registros del paciente.", 500);
    }

    return NextResponse.json({
      patient,
      range,
      anchorDate: latestRecord.fecha_hora,
      records: records ?? []
    });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo cargar el resumen del paciente.", 500);
  }
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
