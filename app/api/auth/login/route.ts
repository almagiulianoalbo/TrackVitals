import { NextRequest } from "next/server";
import { jsonError, jsonSession } from "@/lib/auth-responses";
import { isUserRole, type SessionUser } from "@/lib/auth-types";
import { signSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Solicitud invalida.");
  }

  if (!isUserRole(body.role)) {
    return jsonError("Selecciona si ingresas como paciente o medico.");
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonError("Ingresa email y contrasena.");
  }

  try {
    const supabase = getSupabaseAdmin();

    if (body.role === "medico") {
      const { data, error } = await supabase
        .from("medicos")
        .select("id_medico,nombre,apellido,email,password_med")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error(error);
        return jsonError("No se pudo iniciar sesion.", 500);
      }

      if (!data || !verifyPassword(password, data.password_med)) {
        return jsonError("Email, contrasena o tipo de usuario incorrectos.", 401);
      }

      const user: SessionUser = {
        role: "medico",
        userId: Number(data.id_medico),
        email: data.email,
        name: `${data.nombre} ${data.apellido}`
      };

      return jsonSession(user, signSession(user));
    }

    const { data, error } = await supabase
      .from("pacientes")
      .select("id_paciente,nombre,apellido,email,password_pac")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError("No se pudo iniciar sesion.", 500);
    }

    if (!data || !verifyPassword(password, data.password_pac)) {
      return jsonError("Email, contrasena o tipo de usuario incorrectos.", 401);
    }

    const user: SessionUser = {
      role: "paciente",
      userId: Number(data.id_paciente),
      email: data.email,
      name: `${data.nombre} ${data.apellido}`
    };

    return jsonSession(user, signSession(user));
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo iniciar sesion. Revisa la configuracion del servidor.", 500);
  }
}
