import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesión activa.", 401);
  }

  if (user.role !== "paciente") {
    return jsonError("Solo los pacientes pueden marcar cumplimiento de comidas.", 403);
  }

  const body = await request.json().catch(() => null);
  const mealId = cleanRequiredNumber(body?.id_comida);

  if (!mealId) {
    return jsonError("Seleccioná una comida válida.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: meal, error: mealError } = await supabase
      .from("comidas")
      .select("id_comida,dietas!inner(id_paciente)")
      .eq("id_comida", mealId)
      .eq("dietas.id_paciente", user.userId)
      .maybeSingle();

    if (mealError) {
      console.error(mealError);
      return jsonError("No se pudo validar la comida.", 500);
    }

    if (!meal) {
      return jsonError("La comida no pertenece a tu plan alimentario.", 403);
    }

    const record = {
      id_paciente: user.userId,
      id_comida: mealId,
      fecha: getLocalDateKey(new Date()),
      cumplido: true
    };

    const { data, error } = await supabase
      .from("cumplimiento_comidas")
      .upsert(record, { onConflict: "id_paciente,id_comida,fecha" })
      .select("id_comida,fecha,cumplido")
      .single();

    if (error) {
      console.error(error);
      return jsonError("No se pudo marcar la comida como cumplida.", 500);
    }

    return NextResponse.json({ record: data });
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo marcar la comida como cumplida.", 500);
  }
}

function cleanRequiredNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
