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
  const timeInsights = getTimeInsights(records);

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
          <div className="chart-grid patient-insight-grid">
            <RangeDistributionChart records={records} />
            <MomentResponseChart insights={timeInsights} />
          </div>
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
        <path className="glucose-reference low-line" d="M20 112H300" />
        <path className="glucose-reference high-line" d="M20 63H300" />
        <polyline className="chart-line smooth-line" points={coords.join(" ")} />
        <g className="chart-dots">
          {coords.map((coord, index) => {
            const [cx, cy] = coord.split(",");
            const value = points[index].glucemia_mgdl ?? 0;
            const tone = getGlucoseTone(value);
            return (
              <circle className={`chart-dot-${tone}`} cx={cx} cy={cy} r="4" key={points[index].id_registro}>
                <title>{`${formatShortDate(points[index].fecha_hora)} · ${value} mg/dL`}</title>
              </circle>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function RangeDistributionChart({ records }: { records: PatientRecordChartPoint[] }) {
  const values = records.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);
  const ranges = [
    { key: "low", label: "Bajas", detail: "<70", count: values.filter((value) => value < 70).length },
    { key: "normal", label: "En objetivo", detail: "70-180", count: values.filter((value) => value >= 70 && value <= 180).length },
    { key: "high", label: "Altas", detail: ">180", count: values.filter((value) => value > 180).length }
  ];
  const total = values.length;
  const bestRange = ranges.toSorted((left, right) => right.count - left.count)[0];

  if (!total) {
    return (
      <div className="chart-card insight-card">
        <div className="chart-heading-row">
          <h3>Tiempo en rango</h3>
          <span>Distribución</span>
        </div>
        <p className="chart-empty">Cuando haya glucemias cargadas, se verá qué proporción queda baja, objetivo o alta.</p>
      </div>
    );
  }

  return (
    <div className="chart-card insight-card">
      <div className="chart-heading-row">
        <h3>Tiempo en rango</h3>
        <span>{bestRange ? `${bestRange.label} dominante` : "Distribución"}</span>
      </div>
      <div className="range-chart" aria-label="Distribución de glucemias por rango">
        <div className="range-track">
          {ranges.map((range) => {
            const width = (range.count / total) * 100;
            return width ? <span className={`range-segment ${range.key}`} style={{ width: `${width}%` }} key={range.key} title={`${range.label}: ${range.count} registros`} /> : null;
          })}
        </div>
        <div className="range-summary">
          {ranges.map((range) => {
            const percentage = Math.round((range.count / total) * 100);
            return (
              <article className={`range-stat ${range.key}`} key={range.key}>
                <span>{range.label}</span>
                <strong>{percentage}%</strong>
                <em>{range.count} registros · {range.detail}</em>
              </article>
            );
          })}
        </div>
      </div>
      <div className="chart-legend">
        <span><i className="legend-normal" />objetivo</span>
        <span><i className="legend-high" />alta</span>
        <span><i className="legend-low" />baja</span>
      </div>
    </div>
  );
}

function MomentResponseChart({ insights }: { insights: MomentInsight[] }) {
  const active = insights.filter((item) => item.count > 0);
  const maxGlucose = Math.max(180, ...active.map((item) => item.avgGlucose));

  return (
    <div className="chart-card insight-card">
      <div className="chart-heading-row">
        <h3>Respuesta por momento</h3>
        <span>{active.length ? `${active.length} momentos` : "Sin datos"}</span>
      </div>
      {active.length ? (
        <div className="moment-chart" aria-label="Promedio de glucemia y dosis por momento">
          {active.map((item) => {
            const height = Math.max(16, (item.avgGlucose / maxGlucose) * 100);
            const doseHeight = item.avgDose ? Math.max(8, Math.min(80, item.avgDose * 3)) : 0;
            const tone = getGlucoseTone(item.avgGlucose);

            return (
              <div className="moment-bar" key={item.label}>
                <div className="moment-bars">
                  <span className={`moment-glucose chart-dot-${tone}`} style={{ height: `${height}%` }} title={`${item.label}: ${item.avgGlucose} mg/dL`} />
                  <span className="moment-dose" style={{ height: `${doseHeight}%` }} title={item.avgDose ? `${item.avgDose} u promedio` : "Sin dosis"} />
                </div>
                <strong>{item.shortLabel}</strong>
                <small>{item.avgGlucose}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="chart-empty">Cuando haya momentos cargados, se verá dónde se concentra mejor o peor la glucemia.</p>
      )}
      <div className="chart-legend">
        <span><i className="legend-glucose" />glucemia promedio</span>
        <span><i className="legend-dose" />dosis promedio</span>
      </div>
    </div>
  );
}

function getAverage(records: PatientRecordChartPoint[]) {
  const values = records.map((record) => record.glucemia_mgdl).filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

type MomentInsight = {
  label: string;
  shortLabel: string;
  count: number;
  avgGlucose: number;
  avgDose: number;
};

function getTimeInsights(records: PatientRecordChartPoint[]): MomentInsight[] {
  const groups = new Map<string, { label: string; glucose: number[]; doses: number[] }>();

  records.forEach((record) => {
    const label = record.momento?.trim() || "Sin momento";
    const glucose = Number(record.glucemia_mgdl);
    const dose = Number(record.dosis_unidades);

    if (!groups.has(label)) {
      groups.set(label, { label, glucose: [], doses: [] });
    }

    const group = groups.get(label);
    if (!group) return;
    if (Number.isFinite(glucose)) group.glucose.push(glucose);
    if (Number.isFinite(dose)) group.doses.push(dose);
  });

  return [...groups.values()]
    .map((group) => ({
      label: group.label,
      shortLabel: shortenMoment(group.label),
      count: group.glucose.length,
      avgGlucose: averageNumbers(group.glucose),
      avgDose: averageNumbers(group.doses, 1)
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

function averageNumbers(values: number[], digits = 0) {
  if (!values.length) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(average.toFixed(digits));
}

function getGlucoseTone(value: number) {
  if (value < 70) return "low";
  if (value > 180) return "high";
  return "normal";
}

function shortenMoment(value: string) {
  return value
    .replace("Después", "Desp.")
    .replace("Antes", "Ant.")
    .replace("desayuno", "des.")
    .replace("almuerzo", "alm.")
    .replace("merienda", "mer.")
    .replace("cena", "cena")
    .slice(0, 12);
}

function formatShortDate(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
