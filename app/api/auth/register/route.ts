import { NextRequest } from "next/server";
import { jsonError, jsonSession } from "@/lib/auth-responses";
import { signSession } from "@/lib/auth";
import { isUserRole, type SessionUser } from "@/lib/auth-types";
import { hashPassword } from "@/lib/passwords";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || !isUserRole(body.role)) {
    return jsonError("Solicitud inválida.");
  }

  const nombre = getString(body.nombre);
  const apellido = getString(body.apellido);
  const email = getString(body.email).toLowerCase();
  const password = getString(body.password);

  if (!nombre || !apellido || !email || password.length < 8) {
    return jsonError("Completá nombre, apellido, email y una contraseña de al menos 8 caracteres.");
  }

  try {
    const supabase = getSupabaseAdmin();

    if (body.role === "medico") {
      const { data, error } = await supabase
        .from("medicos")
        .insert({
          nombre,
          apellido,
          email,
          matricula: getString(body.matricula) || null,
          password_med: hashPassword(password)
        })
        .select("id_medico,nombre,apellido,email")
        .single();

      if (error) {
        console.error("No se pudo registrar el médico.", error);
        return registrationError(error);
      }

      const user: SessionUser = { role: "medico", userId: Number(data.id_medico), email: data.email, name: `${data.nombre} ${data.apellido}` };
      return jsonSession(user, signSession(user));
    }

    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        nombre,
        apellido,
        email,
        dni: getString(body.dni) || null,
        telefono: getString(body.telefono) || null,
        fecha_nacimiento: getString(body.fecha_nacimiento) || null,
        sexo: getAllowedSex(body.sexo),
        tipo_diabetes: getString(body.tipo_diabetes) || null,
        id_medico_cabecera: getNumber(body.id_medico_cabecera),
        password_pac: hashPassword(password)
      })
      .select("id_paciente,nombre,apellido,email")
      .single();

    if (error) {
      console.error("No se pudo registrar el paciente.", error);
      return registrationError(error);
    }

    const user: SessionUser = { role: "paciente", userId: Number(data.id_paciente), email: data.email, name: `${data.nombre} ${data.apellido}` };
    return jsonSession(user, signSession(user));
  } catch (error) {
    console.error(error);
    return jsonError("No se pudo crear la cuenta.", 500);
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getAllowedSex(value: unknown) {
  const sex = getString(value);
  return sex === "F" || sex === "M" ? sex : null;
}

function registrationError(error: { code?: string }) {
  if (error.code === "23505") {
    return jsonError("Ya existe una cuenta con alguno de los datos ingresados.", 409);
  }

  if (error.code === "23503") {
    return jsonError("El médico seleccionado ya no está disponible. Elegí otro de la lista.", 400);
  }

  return jsonError("No se pudo crear la cuenta.", 500);
}
