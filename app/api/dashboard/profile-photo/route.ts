import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_NAME = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No autorizado.", 401);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo");

  if (!(file instanceof File)) {
    return jsonError("Seleccioná una imagen para subir.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError("La foto debe ser JPG, PNG o WebP.");
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError("La foto no puede superar los 5 MB.");
  }

  const extension = extensionFromType(file.type);
  const path = `${user.role}/${user.userId}-${Date.now()}.${extension}`;
  const supabase = getSupabaseAdmin();
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, bytes, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    console.error(uploadError);
    return jsonError("No se pudo subir la foto.", 500);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  const table = user.role === "paciente" ? "pacientes" : "medicos";
  const idColumn = user.role === "paciente" ? "id_paciente" : "id_medico";

  const { error: updateError } = await supabase.from(table).update({ foto_url: data.publicUrl }).eq(idColumn, user.userId);

  if (updateError) {
    console.error(updateError);
    return jsonError("La foto se subió, pero no se pudo guardar en el perfil.", 500);
  }

  return NextResponse.json({ photoUrl: data.publicUrl });
}

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
