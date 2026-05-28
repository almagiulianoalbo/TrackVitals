import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No autorizado.", 401);
  }

  const body = await request.json().catch(() => null);
  const alertId = Number(body?.id_alerta);

  if (!Number.isInteger(alertId) || alertId <= 0) {
    return jsonError("Alerta inválida.");
  }

  const supabase = getSupabaseAdmin();

  if (user.role === "paciente") {
    const { error } = await supabase
      .from("alerta")
      .update({ vista: true })
      .eq("id_alerta", alertId)
      .eq("id_paciente", user.userId);

    if (error) {
      console.error(error);
      return jsonError("No se pudo marcar la alerta como vista.", 500);
    }

    return NextResponse.json({ ok: true });
  }

  const { data: alert, error: lookupError } = await supabase
    .from("alerta")
    .select("id_alerta,pacientes!inner(id_medico_cabecera)")
    .eq("id_alerta", alertId)
    .eq("pacientes.id_medico_cabecera", user.userId)
    .maybeSingle();

  if (lookupError) {
    console.error(lookupError);
    return jsonError("No se pudo validar la alerta.", 500);
  }

  if (!alert) {
    return jsonError("No tenés acceso a esa alerta.", 403);
  }

  const { error } = await supabase.from("alerta").update({ vista: true }).eq("id_alerta", alertId);

  if (error) {
    console.error(error);
    return jsonError("No se pudo marcar la alerta como vista.", 500);
  }

  return NextResponse.json({ ok: true });
}
