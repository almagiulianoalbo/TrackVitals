import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user) return jsonError("No autenticado.", 401);

  const body = await request.json().catch(() => null);
  const id = Number(body?.id_alerta ?? body?.id);
  if (!Number.isFinite(id)) return jsonError("Alerta inválida.");

  const { error } = await getSupabaseAdmin().from("alerta").update({ vista: true }).eq("id_alerta", id);
  if (error) return jsonError("No se pudo actualizar la alerta.", 500);

  return Response.json({ ok: true });
}
