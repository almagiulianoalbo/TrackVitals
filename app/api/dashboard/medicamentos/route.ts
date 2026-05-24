import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "paciente") {
    return jsonError("Solo los pacientes pueden cargar medicación desde esta acción.", 403);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos.");
  }

  const nombre = cleanString(body.nombre);

  if (!nombre) {
    return jsonError("El nombre del medicamento es obligatorio.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("medicamentos")
      .insert({
        id_paciente: user.userId,
        nombre,
        dosis: cleanNumber(body.dosis),
        unidad: cleanString(body.unidad),
        frecuencia: cleanString(body.frecuencia),
        fecha_inicio: cleanString(body.fecha_inicio),
        fecha_fin: cleanString(body.fecha_fin),
        estado: cleanString(body.estado) ?? "activa"
      })
      .select("id_medicamento")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo guardar la medicación.", 500);
    }

    return NextResponse.json({ message: "Medicación guardada.", record: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo guardar la medicación.", 500);
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanNumber(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue) return null;
  const numberValue = Number(cleanValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}
