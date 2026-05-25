import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PatientLookupRow = {
  id_paciente: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  dni: string | null;
  id_medico_cabecera: number | null;
};

export async function POST(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "medico") {
    return jsonError("Solo los médicos pueden agregar pacientes.", 403);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos.");
  }

  const idPaciente = cleanOptionalNumber(body.id_paciente);
  const email = cleanEmail(body.email);
  const dni = cleanText(body.dni);

  if (idPaciente === false) {
    return jsonError("El ID del paciente debe ser numérico.");
  }

  if (!idPaciente && !email && !dni) {
    return jsonError("Completá al menos ID, email o DNI del paciente.");
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("pacientes")
      .select("id_paciente,nombre,apellido,email,dni,id_medico_cabecera")
      .limit(1);

    if (idPaciente) {
      query = query.eq("id_paciente", idPaciente);
    } else if (email) {
      query = query.eq("email", email);
    } else {
      query = query.eq("dni", dni);
    }

    const { data: patient, error: patientError } = await query.maybeSingle();

    if (patientError) {
      console.error(patientError);
      return jsonError("No se pudo buscar el paciente.", 500);
    }

    if (!patient) {
      return jsonError("No se encontró un paciente con esos datos.", 404);
    }

    const patientRow = patient as PatientLookupRow;

    if (patientRow.id_medico_cabecera && Number(patientRow.id_medico_cabecera) !== user.userId) {
      return jsonError("Ese paciente ya está vinculado a otro médico.", 409);
    }

    if (Number(patientRow.id_medico_cabecera) === user.userId) {
      return NextResponse.json({ message: "El paciente ya estaba vinculado a tu cuenta.", patient: patientRow });
    }

    const { data, error } = await supabase
      .from("pacientes")
      .update({ id_medico_cabecera: user.userId })
      .eq("id_paciente", patientRow.id_paciente)
      .select("id_paciente,nombre,apellido,email")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo agregar el paciente.", 500);
    }

    return NextResponse.json({ message: "Paciente agregado correctamente.", patient: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo agregar el paciente.", 500);
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function cleanOptionalNumber(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const valueAsNumber = Number(text);

  if (!Number.isSafeInteger(valueAsNumber) || valueAsNumber < 1) {
    return false;
  }

  return valueAsNumber;
}
