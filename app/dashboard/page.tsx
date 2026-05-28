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
      const [{ count }, { data: patients }, { count: alertCount }] = await Promise.all([
        supabase.from("pacientes").select("id_paciente", { count: "exact", head: true }).eq("id_medico_cabecera", user.userId),
        supabase
          .from("pacientes")
          .select("id_paciente,nombre,apellido,email,fecha_nacimiento,tipo_diabetes")
          .eq("id_medico_cabecera", user.userId)
          .order("apellido", { ascending: true }),
        supabase
          .from("alerta")
          .select("id_alerta,pacientes!inner(id_medico_cabecera)", { count: "exact", head: true })
          .eq("pacientes.id_medico_cabecera", user.userId)
      ]);

      const assignedPatients = (patients ?? []) as DoctorPatientPreview[];
      const latestRecordByPatient = await getLatestRecordByPatient(assignedPatients.map((patient) => patient.id_paciente));

      return {
        ...fallback,
        assignedPatients: assignedPatients
          .toSorted((left, right) => compareQuickPatients(left, right, latestRecordByPatient))
          .slice(0, 4),
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

async function getLatestRecordByPatient(patientIds: number[]) {
  const latestRecordByPatient = new Map<number, string>();

  if (!patientIds.length) {
    return latestRecordByPatient;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("registros_diarios")
    .select("id_paciente,fecha_hora")
    .in("id_paciente", patientIds)
    .order("fecha_hora", { ascending: false });

  (data ?? []).forEach((record) => {
    const patientId = Number(record.id_paciente);

    if (!latestRecordByPatient.has(patientId) && record.fecha_hora) {
      latestRecordByPatient.set(patientId, record.fecha_hora);
    }
  });

  return latestRecordByPatient;
}

function compareQuickPatients(left: DoctorPatientPreview, right: DoctorPatientPreview, latestRecordByPatient: Map<number, string>) {
  const leftRecord = latestRecordByPatient.get(left.id_paciente);
  const rightRecord = latestRecordByPatient.get(right.id_paciente);

  if (leftRecord && rightRecord && leftRecord !== rightRecord) {
    return new Date(rightRecord).getTime() - new Date(leftRecord).getTime();
  }

  if (leftRecord && !rightRecord) return -1;
  if (!leftRecord && rightRecord) return 1;

  return `${left.apellido} ${left.nombre}`.localeCompare(`${right.apellido} ${right.nombre}`, "es");
}
