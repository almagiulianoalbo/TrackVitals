import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user) return jsonError("No autenticado.", 401);

  const formData = await request.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) return jsonError("Seleccioná una foto válida.");
  if (!file.type.startsWith("image/")) return jsonError("El archivo tiene que ser una imagen.");

  const supabase = getSupabaseAdmin();
  const extension = file.type.includes("png") ? "png" : "jpg";
  const path = `${user.role}-${user.userId}/profile.${extension}`;
  const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, {
    upsert: true,
    contentType: file.type
  });

  if (uploadError) return jsonError("No se pudo subir la foto.", 500);

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  const table = user.role === "paciente" ? "pacientes" : "medicos";
  const idColumn = user.role === "paciente" ? "id_paciente" : "id_medico";
  const { error } = await supabase.from(table).update({ foto_url: data.publicUrl }).eq(idColumn, user.userId);

  if (error) return jsonError("No se pudo guardar la foto.", 500);
  return Response.json({ url: data.publicUrl });
}
