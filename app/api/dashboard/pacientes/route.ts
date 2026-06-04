import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user || user.role !== "medico") return jsonError("No autorizado.", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Datos inválidos.");

  const idPaciente = getPositiveInteger((body as Record<string, unknown>).id_paciente);
  const email = getString(body?.email).toLowerCase();
  const dni = getString(body?.dni);

  if (!idPaciente && !email && !dni) return jsonError("Ingresá ID, email o DNI del paciente.");

  const supabase = getSupabaseAdmin();
  const patientQuery = supabase.from("pacientes").select("id_paciente,nombre,apellido,email,dni,id_medico_cabecera").limit(2);

  const { data: patients, error: searchError } = idPaciente
    ? await patientQuery.eq("id_paciente", idPaciente)
    : email
      ? await patientQuery.eq("email", email)
      : await patientQuery.eq("dni", dni);

  if (searchError) return jsonError("No se pudo buscar el paciente.", 500);
  const patient = patients?.[0] ?? null;

  if (!patient) return jsonError("No encontramos un paciente con esos datos.", 404);
  if (patients && patients.length > 1) return jsonError("Encontramos más de un paciente con esos datos. Usá el ID del paciente.");

  const patientEmail = getComparableString(patient.email).toLowerCase();
  const patientDni = getComparableString(patient.dni);

  if (email && patientEmail !== email) return jsonError("El email no coincide con el paciente encontrado.");
  if (dni && patientDni !== dni) return jsonError("El DNI no coincide con el paciente encontrado.");

  const currentDoctorId = patient.id_medico_cabecera ? Number(patient.id_medico_cabecera) : null;
  if (currentDoctorId === user.userId) return Response.json({ message: "El paciente ya estaba vinculado." });

  const { error } = await supabase.from("pacientes").update({ id_medico_cabecera: user.userId }).eq("id_paciente", patient.id_paciente);

  if (error) return jsonError("No se pudo agregar el paciente a tu directorio.", 500);
  return Response.json({ message: currentDoctorId ? "Paciente reasignado a tu directorio." : "Paciente agregado a tu directorio." });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getComparableString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
