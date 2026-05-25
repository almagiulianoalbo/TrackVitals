import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DoctorDashboardPanel, type DoctorPatientPreview } from "@/components/DoctorDashboardPanel";
import { PatientDashboardPanel } from "@/components/PatientDashboardPanel";
import { getCurrentSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";
import { formatDateTime, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type DashboardData = {
  assignedPatients: DoctorPatientPreview[];
  assignedPatientsCount: number;
  doctorAlertCount: number;
  nextAppointment: PatientNextAppointment | null;
  patientAlertCount: number;
  patientRecords: PatientRecordChartPoint[];
};

type PatientNextAppointment = {
  fecha_hora: string | null;
  motivo: string | null;
};

export type PatientRecordChartPoint = {
  id_registro: number;
  fecha_hora: string;
  glucemia_mgdl: number | null;
};

export default async function DashboardPage() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user);
  const subtitle =
    user.role === "medico" ? "Panel clínico y seguimiento de pacientes." : "Seguimiento personal y controles diarios.";

  return (
    <DashboardShell user={user} activeItem="panel" subtitle={subtitle}>
      {user.role === "medico" ? (
        <DoctorDashboardPanel patients={data.assignedPatients} patientsCount={data.assignedPatientsCount} alertCount={data.doctorAlertCount} />
      ) : (
        <PatientDashboardPanel
          nextAppointmentValue={data.nextAppointment ? formatDateTime(data.nextAppointment.fecha_hora) : "--"}
          nextAppointmentStatus={data.nextAppointment ? formatValue(data.nextAppointment.motivo, "Turno pendiente") : "Sin turno cargado"}
          alertCount={data.patientAlertCount}
          records={data.patientRecords}
        />
      )}
    </DashboardShell>
  );
}

async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const fallback: DashboardData = {
    assignedPatients: [],
    assignedPatientsCount: 0,
    doctorAlertCount: 0,
    nextAppointment: null,
    patientAlertCount: 0,
    patientRecords: []
  };

  try {
    const supabase = getSupabaseAdmin();

    if (user.role === "medico") {
      const [{ count }, { data }, { count: alertCount }] = await Promise.all([
        supabase.from("pacientes").select("id_paciente", { count: "exact", head: true }).eq("id_medico_cabecera", user.userId),
        supabase
          .from("pacientes")
          .select("id_paciente,nombre,apellido,email,fecha_nacimiento,tipo_diabetes")
          .eq("id_medico_cabecera", user.userId)
          .order("apellido", { ascending: true })
          .limit(5),
        supabase
          .from("alerta")
          .select("id_alerta,pacientes!inner(id_medico_cabecera)", { count: "exact", head: true })
          .eq("pacientes.id_medico_cabecera", user.userId)
      ]);

      return {
        ...fallback,
        assignedPatients: (data ?? []) as DoctorPatientPreview[],
        assignedPatientsCount: count ?? 0,
        doctorAlertCount: alertCount ?? 0
      };
    }

    const [{ data }, { count }, { data: records }] = await Promise.all([
      supabase
        .from("turnos")
        .select("fecha_hora,motivo")
        .eq("id_paciente", user.userId)
        .eq("estado", "pendiente")
        .gte("fecha_hora", toSupabaseTimestamp(new Date()))
        .order("fecha_hora", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("alerta").select("id_alerta", { count: "exact", head: true }).eq("id_paciente", user.userId).eq("vista", false),
      supabase
        .from("registros_diarios")
        .select("id_registro,fecha_hora,glucemia_mgdl")
        .eq("id_paciente", user.userId)
        .order("fecha_hora", { ascending: false })
        .limit(80)
    ]);

    return {
      ...fallback,
      nextAppointment: (data as PatientNextAppointment | null) ?? null,
      patientAlertCount: count ?? 0,
      patientRecords: ((records ?? []) as PatientRecordChartPoint[]).reverse()
    };
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
