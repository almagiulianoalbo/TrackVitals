import { redirect } from "next/navigation";
import { DashboardShell, getInitials } from "@/components/DashboardChrome";
import { getCurrentSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PatientPreview = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string | null;
  fecha_nacimiento: string | null;
  tipo_diabetes: string | null;
};

type PatientProfile = {
  fecha_nacimiento: string | null;
  telefono: string | null;
  tipo_diabetes: string | null;
  id_medico_cabecera: number | null;
};

type DashboardData = {
  assignedPatients: PatientPreview[];
  assignedPatientsCount: number;
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
        <DoctorDashboard user={user} patients={data.assignedPatients} patientsCount={data.assignedPatientsCount} />
      ) : (
        <PatientDashboard />
      )}
    </DashboardShell>
  );
}

function DoctorDashboard({
  user,
  patients,
  patientsCount
}: {
  user: SessionUser;
  patients: PatientPreview[];
  patientsCount: number;
}) {
  const selectedPatient = patients[0] ?? null;

  return (
    <div className="dashboard-content">
      <section className="quick-actions" aria-label="Acciones rápidas">
        <QuickAction label="Nueva prescripción" detail="Medicamentos e indicaciones" tone="primary" />
        <QuickAction label="Registrar signos" detail="Glucemia, peso e insulina" />
        <QuickAction label="Agregar paciente" detail="Vincular seguimiento" />
        <QuickAction label="Crear turno" detail="Consulta o control" />
      </section>

      <section className="metric-grid" aria-label="Resumen médico">
        <MetricCard label="Pacientes activos" value={String(patientsCount)} status="Asignados a tu matrícula" />
        <MetricCard label="Alertas abiertas" value="0" status="Sin alertas críticas" />
        <MetricCard label="Prescripciones" value="0" status="Pendientes de carga" />
        <MetricCard label="Turnos próximos" value="0" status="Agenda libre" />
      </section>

      <section className="clinical-grid">
        <article className="dashboard-card patient-focus">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paciente seleccionado</p>
              <h2>{selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellido}` : "Sin pacientes asignados"}</h2>
            </div>
            <div className="period-tabs" aria-label="Rango de análisis">
              <button className="active" type="button">
                7 días
              </button>
              <button type="button">1 mes</button>
              <button type="button">3 meses</button>
            </div>
          </div>

          <div className="patient-row">
            <span className="avatar-badge" aria-hidden="true">
              {selectedPatient ? getInitials(`${selectedPatient.nombre} ${selectedPatient.apellido}`) : "--"}
            </span>
            <div>
              <strong>{selectedPatient ? formatDiabetes(selectedPatient.tipo_diabetes) : "Vinculá pacientes para comenzar"}</strong>
              <span>
                {selectedPatient
                  ? `${formatAge(selectedPatient.fecha_nacimiento)} · Último control pendiente`
                  : "Los pacientes aparecerán cuando tengan tu ID como médico de cabecera."}
              </span>
            </div>
          </div>

          <div className="clinical-metrics">
            <MetricCard label="Glucemia" value="--" unit="mg/dL" status="Sin registros" compact />
            <MetricCard label="Última insulina" value="--" unit="u" status="Sin carga" compact />
            <MetricCard label="Peso" value="--" unit="kg" status="Sin carga" compact />
            <MetricCard label="IMC" value="--" status="Sin cálculo" compact />
          </div>

          <div className="chart-grid">
            <MiniLineChart title="Glucemia últimos 7 días" />
            <MiniBarChart title="Dosis de insulina" />
          </div>
        </article>

        <aside className="dashboard-card stacked-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Lista rápida</p>
              <h2>Mis pacientes</h2>
            </div>
          </div>

          <div className="patient-list">
            {patients.length ? (
              patients.slice(0, 4).map((patient) => (
                <div className="patient-list-item" key={patient.id_paciente}>
                  <span className="avatar-badge small" aria-hidden="true">
                    {getInitials(`${patient.nombre} ${patient.apellido}`)}
                  </span>
                  <div>
                    <strong>
                      {patient.nombre} {patient.apellido}
                    </strong>
                    <small>{patient.email ?? "Email pendiente"}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">Todavía no hay pacientes vinculados.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function PatientDashboard() {
  return (
    <div className="dashboard-content">
      <section className="clinical-grid patient-main-grid">
        <article className="dashboard-card patient-focus">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Registro diario</p>
              <h2>Control de hoy</h2>
            </div>
            <button className="inline-action" type="button">
              Crear registro
            </button>
          </div>

          <div className="clinical-metrics">
            <MetricCard label="Glucemia" value="--" unit="mg/dL" status="Sin medición" compact />
            <MetricCard label="Insulina" value="--" unit="u" status="Sin carga" compact />
            <MetricCard label="Peso" value="--" unit="kg" status="Sin carga" compact />
            <MetricCard label="Síntomas" value="0" status="Sin alertas" compact />
          </div>

          <div className="chart-grid">
            <MiniLineChart title="Tendencia de glucemia" />
            <MiniBarChart title="Adherencia semanal" />
          </div>
        </article>
      </section>

      <section className="metric-grid" aria-label="Resumen del paciente">
        <MetricCard label="Pedir turno" value="+" status="Control con tu médico" />
        <MetricCard label="Cargar medicación" value="+" status="Dosis y horario" />
        <MetricCard label="Próximo control" value="--" status="Sin turno cargado" />
        <MetricCard label="Alertas" value="0" status="Sin alertas activas" tone="danger" />
      </section>
    </div>
  );
}

function QuickAction({
  label,
  detail,
  tone = "neutral"
}: {
  label: string;
  detail: string;
  tone?: "primary" | "neutral";
}) {
  return (
    <button className={`quick-action ${tone === "primary" ? "primary" : ""}`} type="button">
      <span className="quick-action-mark" aria-hidden="true">
        +
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  unit,
  status,
  tone = "neutral",
  compact = false
}: {
  label: string;
  value: string;
  unit?: string;
  status: string;
  tone?: "neutral" | "danger";
  compact?: boolean;
}) {
  return (
    <article className={`metric-card ${compact ? "compact" : ""} ${tone === "danger" ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
      <em>{status}</em>
    </article>
  );
}

function MiniLineChart({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <svg viewBox="0 0 320 150" role="img" aria-label={title}>
        <path className="chart-grid-line" d="M24 34H300M24 76H300M24 118H300" />
        <path className="chart-line" d="M28 112L72 84L116 104L160 58L204 92L248 44L292 54" />
        <g className="chart-dots">
          <circle cx="72" cy="84" r="4" />
          <circle cx="160" cy="58" r="4" />
          <circle cx="248" cy="44" r="4" />
          <circle cx="292" cy="54" r="4" />
        </g>
      </svg>
    </div>
  );
}

function MiniBarChart({ title }: { title: string }) {
  const bars = [38, 18, 52, 30, 66, 58];

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart" aria-label={title}>
        {bars.map((height, index) => (
          <span style={{ height: `${height}%` }} key={`${height}-${index}`} />
        ))}
      </div>
    </div>
  );
}

async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const fallback: DashboardData = {
    assignedPatients: [],
    assignedPatientsCount: 0
  };

  try {
    const supabase = getSupabaseAdmin();

    if (user.role === "medico") {
      const [{ count }, { data }] = await Promise.all([
        supabase.from("pacientes").select("id_paciente", { count: "exact", head: true }).eq("id_medico_cabecera", user.userId),
        supabase
          .from("pacientes")
          .select("id_paciente,nombre,apellido,email,fecha_nacimiento,tipo_diabetes")
          .eq("id_medico_cabecera", user.userId)
          .order("apellido", { ascending: true })
          .limit(5)
      ]);

      return {
        ...fallback,
        assignedPatients: (data ?? []) as PatientPreview[],
        assignedPatientsCount: count ?? 0
      };
    }

    return fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function formatAge(date: string | null | undefined) {
  if (!date) {
    return "Edad pendiente";
  }

  const birthDate = new Date(date);

  if (Number.isNaN(birthDate.getTime())) {
    return "Edad pendiente";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} años`;
}

function formatDiabetes(value: string | null | undefined) {
  const labels: Record<string, string> = {
    tipo_1: "Diabetes tipo 1",
    tipo_2: "Diabetes tipo 2",
    gestacional: "Diabetes gestacional",
    otro: "Otro tipo"
  };

  return value ? labels[value] ?? value : "No especificado";
}
