import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MessageRow = {
  id_mensaje: number;
  remitente: string | null;
  asunto: string | null;
  contenido: string | null;
  leido: boolean | null;
  fecha_hora: string;
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
  medicos?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

export default async function MessagesPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const messages = await getMessages(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="mensajes" subtitle="Mensajes entre paciente y médico.">
      <DataList
        eyebrow="Mensajes"
        title="Mensajes cargados"
        emptyMessage="Todavía no hay mensajes cargados."
        items={messages.map((message) => toListItem(message, user.role))}
      />
    </DashboardShell>
  );
}

async function getMessages(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = role === "medico" ? "id_medico" : "id_paciente";
    const { data, error } = await supabase
      .from("mensajes")
      .select("id_mensaje,remitente,asunto,contenido,leido,fecha_hora,pacientes(nombre,apellido),medicos(nombre,apellido)")
      .eq(filterColumn, userId)
      .order("fecha_hora", { ascending: false });

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

function toListItem(message: MessageRow, role: "paciente" | "medico"): ListItem {
  return {
    id: message.id_mensaje,
    title: message.asunto || `Mensaje #${message.id_mensaje}`,
    meta: role === "medico" ? formatPatientName(message.pacientes) : `Dr/a. ${formatPatientName(message.medicos)}`,
    details: [
      { label: "Fecha", value: formatDateTime(message.fecha_hora) },
      { label: "Remitente", value: formatValue(message.remitente) },
      { label: "Leído", value: message.leido ? "Sí" : "No" },
      { label: "Contenido", value: formatValue(message.contenido) }
    ]
  };
}
