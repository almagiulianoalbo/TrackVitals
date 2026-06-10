import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { MessagesCenter, type MessageContact, type MessageRow } from "@/components/MessagesCenter";
import { getCurrentSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function MessagesPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const [messages, contacts] = await Promise.all([getMessages(user), getContacts(user)]);

  return (
    <DashboardShell user={user} activeItem="mensajes" subtitle="Mensajes entre paciente y médico.">
      <MessagesCenter contacts={contacts} messages={messages} role={user.role} />
    </DashboardShell>
  );
}

async function getMessages(user: SessionUser) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = user.role === "medico" ? "id_medico" : "id_paciente";
    const { data, error } = await supabase
      .from("mensajes")
      .select("id_mensaje,id_paciente,id_medico,remitente,asunto,contenido,leido,fecha_hora")
      .eq(filterColumn, user.userId)
      .order("fecha_hora", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as MessageRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getContacts(user: SessionUser) {
  try {
    const supabase = getSupabaseAdmin();

    if (user.role === "medico") {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id_paciente,nombre,apellido,email")
        .eq("id_medico_cabecera", user.userId)
        .order("apellido", { ascending: true });

      if (error) {
        console.error(error);
        return [];
      }

      return (data ?? []).map((patient) => ({
        id: Number(patient.id_paciente),
        name: `${patient.nombre ?? ""} ${patient.apellido ?? ""}`.trim() || `Paciente #${patient.id_paciente}`,
        email: patient.email ?? null,
        role: "paciente" as const
      })) satisfies MessageContact[];
    }

    const { data: patient, error: patientError } = await supabase
      .from("pacientes")
      .select("id_medico_cabecera")
      .eq("id_paciente", user.userId)
      .maybeSingle();

    if (patientError) {
      console.error(patientError);
      return [];
    }

    if (!patient?.id_medico_cabecera) {
      return [];
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("medicos")
      .select("id_medico,nombre,apellido,email")
      .eq("id_medico", patient.id_medico_cabecera)
      .maybeSingle();

    if (doctorError) {
      console.error(doctorError);
      return [];
    }

    return doctor
      ? [
          {
            id: Number(doctor.id_medico),
            name: `Dr/a. ${`${doctor.nombre ?? ""} ${doctor.apellido ?? ""}`.trim() || `Médico #${doctor.id_medico}`}`,
            email: doctor.email ?? null,
            role: "medico" as const
          }
        ]
      : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
