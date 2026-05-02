import { NextRequest } from "next/server";
import { jsonError, jsonSession } from "@/lib/auth-responses";
import { isUserRole, type SessionUser } from "@/lib/auth-types";
import { signSession } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Solicitud invalida.");
  }

  if (!isUserRole(body.role)) {
    return jsonError("Selecciona si estas registrandote como paciente o medico.");
  }

  const nombre = cleanText(body.nombre);
  const apellido = cleanText(body.apellido);
  const email = cleanEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!nombre || !apellido || !email || !password) {
    return jsonError("Completa nombre, apellido, email y contrasena.");
  }

  if (!isValidEmail(email)) {
    return jsonError("Ingresa un email valido.");
  }

  if (password.length < 8) {
    return jsonError("La contrasena debe tener al menos 8 caracteres.");
  }

  try {
    const supabase = getSupabaseAdmin();

    if (body.role === "medico") {
      const matricula = cleanText(body.matricula);

      if (!matricula) {
        return jsonError("Ingresa la matricula profesional.");
      }

      const { data, error } = await insertMedico(supabase, {
        nombre,
        apellido,
        email,
        matricula,
        password_med: hashPassword(password)
      });

      if (error) {
        return handleSupabaseInsertError(error);
      }

      if (!data) {
        return jsonError("Supabase no devolvio los datos del medico creado.", 500);
      }

      const user: SessionUser = {
        role: "medico",
        userId: Number(data.id_medico),
        email: data.email,
        name: `${data.nombre} ${data.apellido}`
      };

      return jsonSession(user, signSession(user));
    }

    const dni = cleanText(body.dni);
    const idMedicoCabecera = cleanOptionalNumber(body.id_medico_cabecera);

    if (!dni) {
      return jsonError("Ingresa el DNI del paciente.");
    }

    if (idMedicoCabecera === false) {
      return jsonError("El ID del medico de cabecera debe ser numerico.");
    }

    const { data, error } = await insertPaciente(supabase, {
      nombre,
      apellido,
      email,
      dni,
      id_medico_cabecera: idMedicoCabecera,
      fecha_nacimiento: cleanNullable(body.fecha_nacimiento),
      sexo: cleanNullable(body.sexo),
      telefono: cleanNullable(body.telefono),
      tipo_diabetes: cleanNullable(body.tipo_diabetes),
      password_pac: hashPassword(password)
    });

    if (error) {
      return handleSupabaseInsertError(error);
    }

    if (!data) {
      return jsonError("Supabase no devolvio los datos del paciente creado.", 500);
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
    return jsonError("No se pudo completar el registro. Revisa la configuracion del servidor.", 500);
  }
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type SupabaseInsertError = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type MedicoRegisterRow = {
  id_medico: number;
  nombre: string;
  apellido: string;
  email: string;
};

type PacienteRegisterRow = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string;
};

async function insertMedico(supabase: SupabaseAdmin, payload: Record<string, unknown>) {
  let result = await supabase.from("medicos").insert(payload).select("id_medico,nombre,apellido,email").single();

  if (result.error && isIdGenerationError(result.error, "id_medico", "medicos_pkey")) {
    const nextId = await getNextId(supabase, "medicos", "id_medico");

    if (nextId.error) {
      return { data: null, error: nextId.error };
    }

    result = await supabase
      .from("medicos")
      .insert({ ...payload, id_medico: nextId.value })
      .select("id_medico,nombre,apellido,email")
      .single();
  }

  return result as { data: MedicoRegisterRow | null; error: SupabaseInsertError | null };
}

async function insertPaciente(supabase: SupabaseAdmin, payload: Record<string, unknown>) {
  let result = await supabase.from("pacientes").insert(payload).select("id_paciente,nombre,apellido,email").single();

  if (result.error && isIdGenerationError(result.error, "id_paciente", "pacientes_pkey")) {
    const nextId = await getNextId(supabase, "pacientes", "id_paciente");

    if (nextId.error) {
      return { data: null, error: nextId.error };
    }

    result = await supabase
      .from("pacientes")
      .insert({ ...payload, id_paciente: nextId.value })
      .select("id_paciente,nombre,apellido,email")
      .single();
  }

  return result as { data: PacienteRegisterRow | null; error: SupabaseInsertError | null };
}

async function getNextId(supabase: SupabaseAdmin, table: "medicos" | "pacientes", idColumn: "id_medico" | "id_paciente") {
  const { data, error } = await supabase.from(table).select(idColumn).order(idColumn, { ascending: false }).limit(1).maybeSingle();

  if (error) {
    return { error };
  }

  const row = data as Record<string, unknown> | null;
  const currentId = row ? Number(row[idColumn]) : 0;
  const value = currentId + 1;

  if (!Number.isSafeInteger(value) || value < 1) {
    return {
      error: {
        message: `No se pudo calcular el proximo valor de ${idColumn}.`
      }
    };
  }

  return { value };
}

function isIdGenerationError(error: SupabaseInsertError, idColumn: string, primaryKeyName: string) {
  const text = `${error.code ?? ""} ${error.message} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  return (
    (error.code === "23502" && text.includes(idColumn)) ||
    (error.code === "23505" && (text.includes(idColumn) || text.includes(primaryKeyName)))
  );
}

function handleSupabaseInsertError(error: SupabaseInsertError) {
  const text = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  if (error.code === "23505" || text.includes("duplicate") || text.includes("unique")) {
    if (text.includes("email")) {
      return jsonError("Ya existe una cuenta con ese email.", 409);
    }

    if (text.includes("dni")) {
      return jsonError("Ya existe un paciente con ese DNI.", 409);
    }

    if (text.includes("matricula")) {
      return jsonError("Ya existe un medico con esa matricula.", 409);
    }

    if (text.includes("id_paciente") || text.includes("pacientes_pkey")) {
      return jsonError("No se pudo generar un ID nuevo para el paciente. Revisa la primary key id_paciente.", 500);
    }

    if (text.includes("id_medico") || text.includes("medicos_pkey")) {
      return jsonError("No se pudo generar un ID nuevo para el medico. Revisa la primary key id_medico.", 500);
    }

    if (text.includes("nombre")) {
      return jsonError("Supabase esta rechazando el nombre por una restriccion UNIQUE. Revisa los constraints de la tabla.", 500);
    }

    return jsonError("Ya existe un registro con una restriccion unica de Supabase.", 409);
  }

  if (error.code === "23502") {
    if (text.includes("id_paciente")) {
      return jsonError("La tabla pacientes no esta generando id_paciente automaticamente.", 500);
    }

    if (text.includes("id_medico")) {
      return jsonError("La tabla medicos no esta generando id_medico automaticamente.", 500);
    }

    return jsonError("Falta completar un campo obligatorio de la tabla.", 400);
  }

  if (error.code === "23503" || text.includes("foreign key")) {
    return jsonError("No se encontro el medico de cabecera indicado.");
  }

  return jsonError("No se pudo crear la cuenta. Verifica los datos ingresados.", 500);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function cleanNullable(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function cleanOptionalNumber(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isInteger(number) && number > 0 ? number : false;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
