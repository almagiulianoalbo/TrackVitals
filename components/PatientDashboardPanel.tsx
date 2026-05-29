import Link from "next/link";
import type { PatientRecordChartPoint } from "@/app/dashboard/page";

export function PatientDashboardPanel({
  nextAppointmentValue,
  nextAppointmentStatus,
  alertCount,
  records
}: {
  nextAppointmentValue: string;
  nextAppointmentStatus: string;
  alertCount: number;
  records: PatientRecordChartPoint[];
}) {
  const latest = records.at(-1);
  const average = getAverage(records);

  return (
    <div className="dashboard-content">
      <section className="metric-grid" aria-label="Acciones rápidas">
        <LinkMetric href="/dashboard/mis-registros" label="Mis registros" value={latest?.glucemia_mgdl ? `${latest.glucemia_mgdl}` : "--"} status="Última glucemia" />
        <LinkMetric href="/dashboard/turnos" label="Próximo control" value={nextAppointmentValue} status={nextAppointmentStatus} />
        <LinkMetric href="/dashboard/alertas" label="Alertas" value={String(alertCount)} status={alertCount ? "Pendientes" : "Sin pendientes"} />
        <LinkMetric href="/dashboard/medicacion" label="Medicación" value="Ver" status="Indicaciones activas" />
      </section>

      <section className="clinical-grid patient-main-grid">
        <article className="dashboard-card patient-focus">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Registro diario</p>
              <h2>Resumen de glucemia</h2>
            </div>
          </div>
          <div className="clinical-metrics">
            <div className="metric-card compact">
              <span>Promedio</span>
              <strong>{average ?? "--"}{average ? <small> mg/dL</small> : null}</strong>
              <em>Últimos registros</em>
            </div>
            <div className="metric-card compact">
              <span>Registros</span>
              <strong>{records.length}</strong>
              <em>Total cargado</em>
            </div>
          </div>
          <MiniLineChart records={records} />
        </article>
      </section>
    </div>
  );
}

function LinkMetric({ href, label, value, status }: { href: string; label: string; value: string; status: string }) {
  return (
    <Link className="metric-card action-metric-card link-metric-card" href={href}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{status}</em>
    </Link>
  );
}

function MiniLineChart({ records }: { records: PatientRecordChartPoint[] }) {
  const points = records.filter((record) => typeof record.glucemia_mgdl === "number").slice(-14);
  if (!points.length) return <p className="empty-state">Todavía no hay datos para graficar.</p>;

  const values = points.map((point) => point.glucemia_mgdl ?? 0);
  const min = Math.min(60, ...values);
  const max = Math.max(220, ...values);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 160 : 20 + (index * 280) / (points.length - 1);
    const y = 150 - (((point.glucemia_mgdl ?? min) - min) * 120) / (max - min || 1);
    return `${x},${y}`;
  });

  return (
    <div className="chart-card">
      <div className="chart-heading-row">
        <h3>Tendencia de glucemia</h3>
        <span>{points.length} puntos</span>
      </div>
      <svg viewBox="0 0 320 170" role="img" aria-label="Tendencia de glucemia">
        <path className="chart-grid-line" d="M20 40H300M20 95H300M20 150H300" />
        <polyline className="chart-line smooth-line" points={coords.join(" ")} />
        <g className="chart-dots">
          {coords.map((coord, index) => {
            const [cx, cy] = coord.split(",");
            return <circle cx={cx} cy={cy} r="4" key={points[index].id_registro} />;
          })}
        </g>
      </svg>
    </div>
  );
}

function getAverage(records: PatientRecordChartPoint[]) {
  const values = records.map((record) => record.glucemia_mgdl).filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
