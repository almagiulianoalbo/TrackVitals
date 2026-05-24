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
    return jsonError("Solo los pacientes pueden crear registros diarios.", 403);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos.");
  }

  const fechaHora = cleanString(body.fecha_hora);

  if (!fechaHora) {
    return jsonError("La fecha y hora es obligatoria.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("registros_diarios")
      .insert({
        id_paciente: user.userId,
        fecha_hora: fechaHora,
        momento: cleanString(body.momento),
        glucemia_mgdl: cleanInteger(body.glucemia_mgdl),
        carbohidratos_g: cleanInteger(body.carbohidratos_g),
        tipo_insulina: cleanString(body.tipo_insulina),
        dosis_unidades: cleanNumber(body.dosis_unidades)
      })
      .select("id_registro")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo guardar el registro diario.", 500);
    }

    return NextResponse.json({ message: "Registro diario guardado.", record: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo guardar el registro diario.", 500);
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanInteger(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue) return null;
  const numberValue = Number(cleanValue);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function cleanNumber(value: unknown) {
  const cleanValue = cleanString(value);
  if (!cleanValue) return null;
  const numberValue = Number(cleanValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}
