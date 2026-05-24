import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AppointmentRow = {
  id_turno: number;
  fecha_hora: string | null;
  motivo: string | null;
  estado: string | null;
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
  medicos?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

export default async function AppointmentsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const appointments = await getAppointments(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="turnos" subtitle="Turnos y consultas programadas.">
      <DataList
        eyebrow="Turnos"
        title="Turnos cargados"
        emptyMessage="Todavía no hay turnos cargados."
        items={appointments.map((appointment) => toListItem(appointment, user.role))}
      />
    </DashboardShell>
  );
}

async function getAppointments(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = role === "medico" ? "id_medico" : "id_paciente";
    const { data, error } = await supabase
      .from("turnos")
      .select("id_turno,fecha_hora,motivo,estado,pacientes(nombre,apellido),medicos(nombre,apellido)")
      .eq(filterColumn, userId)
      .order("fecha_hora", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as AppointmentRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(appointment: AppointmentRow, role: "paciente" | "medico"): ListItem {
  return {
    id: appointment.id_turno,
    title: formatDateTime(appointment.fecha_hora),
    meta: role === "medico" ? formatPatientName(appointment.pacientes) : `Dr/a. ${formatPatientName(appointment.medicos)}`,
    details: [
      { label: "Motivo", value: formatValue(appointment.motivo) },
      { label: "Estado", value: formatValue(appointment.estado, "Sin estado") }
    ]
  };
}
