import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { AppointmentsBoard, type AppointmentBoardRow } from "@/components/AppointmentsBoard";
import { getCurrentSession } from "@/lib/auth";
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
      <AppointmentsBoard appointments={appointments} role={user.role} />
    </DashboardShell>
  );
}

async function getAppointments(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = role === "medico" ? "id_medico" : "id_paciente";
    const now = toSupabaseTimestamp(new Date());

    const [{ data: pendingData, error: pendingError }, { data: historyData, error: historyError }] = await Promise.all([
      supabase
        .from("turnos")
        .select("id_turno,fecha_hora,motivo,estado,pacientes(nombre,apellido),medicos(nombre,apellido)")
        .eq(filterColumn, userId)
        .eq("estado", "pendiente")
        .gte("fecha_hora", now)
        .order("fecha_hora", { ascending: true }),
      supabase
        .from("turnos")
        .select("id_turno,fecha_hora,motivo,estado,pacientes(nombre,apellido),medicos(nombre,apellido)")
        .eq(filterColumn, userId)
        .lt("fecha_hora", now)
        .order("fecha_hora", { ascending: false })
    ]);

    if (pendingError || historyError) {
      console.error(pendingError ?? historyError);
      return [];
    }

    return [
      ...((pendingData ?? []) as AppointmentRow[]).map((appointment) => ({ ...appointment, vista: "pendientes" as const })),
      ...((historyData ?? []) as AppointmentRow[]).map((appointment) => ({ ...appointment, vista: "historial" as const }))
    ] satisfies AppointmentBoardRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
