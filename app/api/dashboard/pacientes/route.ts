import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user || user.role !== "medico") return jsonError("No autorizado.", 401);

  const body = await request.json().catch(() => null);
  const nombre = getString(body?.nombre);
  const apellido = getString(body?.apellido);
  const email = getString(body?.email).toLowerCase();

  if (!nombre || !apellido || !email) return jsonError("Completá nombre, apellido y email.");

  const { error } = await getSupabaseAdmin().from("pacientes").insert({
    nombre,
    apellido,
    email,
    telefono: getString(body?.telefono) || null,
    dni: getString(body?.dni) || null,
    fecha_nacimiento: getString(body?.fecha_nacimiento) || null,
    tipo_diabetes: getString(body?.tipo_diabetes) || null,
    id_medico_cabecera: user.userId
  });

  if (error) return jsonError("No se pudo agregar el paciente.", 500);
  return Response.json({ message: "Paciente agregado." });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
