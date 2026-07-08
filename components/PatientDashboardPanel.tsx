"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PatientRecordChartPoint } from "@/app/dashboard/page";

type PatientModalType = "record" | "appointment";

type SubmitState = {
  loading: boolean;
  error: string | null;
};

const initialSubmitState: SubmitState = {
  loading: false,
  error: null
};

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
  const weeklySummary = buildWeeklySummary(records);
  const [activeModal, setActiveModal] = useState<PatientModalType | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(initialSubmitState);
  const router = useRouter();

  function openModal(type: PatientModalType) {
    setSubmitState(initialSubmitState);
    setActiveModal(type);
  }

  function closeModal() {
    if (submitState.loading) return;
    setActiveModal(null);
    setSubmitState(initialSubmitState);
  }

  async function submitModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeModal) return;

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const endpoint = activeModal === "record" ? "/api/dashboard/registros-diarios" : "/api/dashboard/turnos";
    const fallbackError = activeModal === "record" ? "No se pudo cargar el registro." : "No se pudo crear el turno.";

    setSubmitState({ loading: true, error: null });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setSubmitState({ loading: false, error: data.error ?? fallbackError });
        return;
      }

      form.reset();
      setActiveModal(null);
      setSubmitState(initialSubmitState);
      router.refresh();
    } catch {
      setSubmitState({ loading: false, error: "No se pudo conectar con el servidor." });
    }
  }

  return (
    <div className="dashboard-content">
      <section className="metric-grid" aria-label="Acciones rápidas">
        <ActionMetric label="Mis registros" value={latest?.glucemia_mgdl ? `${latest.glucemia_mgdl}` : "--"} status="Cargar nuevo registro" onClick={() => openModal("record")} />
        <ActionMetric label="Próximo control" value={nextAppointmentValue} status={nextAppointmentStatus} valueStyle="date" onClick={() => openModal("appointment")} />
        <LinkMetric href="/dashboard/alertas" label="Alertas" value={String(alertCount)} status={alertCount ? "Pendientes" : "Sin pendientes"} />
        <LinkMetric href="/dashboard/medicacion" label="Medicación" value="Ver" status="Indicaciones activas" />
      </section>

      <section className="clinical-grid patient-main-grid">
        <article className="patient-focus patient-focus-flat">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Últimos 7 días</p>
              <h2>Resumen de registros semanales</h2>
            </div>
            <span className="summary-period">{weeklySummary.periodLabel}</span>
          </div>

          <div className="weekly-summary-layout">
            <div className="weekly-chart-stack">
              <WeeklyInsightEntryCard summary={weeklySummary} />
              <RangeDistributionChart records={weeklySummary.records} compact />
            </div>
            <WeeklyMetricPanel summary={weeklySummary} />
          </div>
        </article>
      </section>

      {activeModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="patient-action-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acción rápida</p>
                <h2 id="patient-action-title">{activeModal === "record" ? "Nuevo registro" : "Nuevo turno"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} disabled={submitState.loading} aria-label="Cerrar">
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={submitModal}>
              {activeModal === "record" ? <RecordFields /> : null}
              {activeModal === "appointment" ? <AppointmentFields /> : null}

              {submitState.error ? <p className="form-error">{submitState.error}</p> : null}
              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={submitState.loading}>
                  {submitState.loading ? "Guardando..." : activeModal === "record" ? "Guardar registro" : "Agregar turno"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ActionMetric({ label, value, status, valueStyle, onClick }: { label: string; value: string; status: string; valueStyle?: "date"; onClick: () => void }) {
  return (
    <button className="metric-card action-metric-card" type="button" onClick={onClick}>
      <span>{label}</span>
      <strong className={valueStyle === "date" ? "metric-date-value" : undefined}>{value}</strong>
      <em>{status}</em>
    </button>
  );
}

function LinkMetric({ href, label, value, status, valueStyle }: { href: string; label: string; value: string; status: string; valueStyle?: "date" }) {
  return (
    <Link className="metric-card action-metric-card link-metric-card" href={href}>
      <span>{label}</span>
      <strong className={valueStyle === "date" ? "metric-date-value" : undefined}>{value}</strong>
      <em>{status}</em>
    </Link>
  );
}

function RecordFields() {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Fecha y hora</span>
        <input name="fecha_hora" type="datetime-local" defaultValue={getNowInputValue()} required />
      </label>
      <label className="field">
        <span>Momento</span>
        <select name="momento" defaultValue="Antes del desayuno">
          <option>Antes del desayuno</option>
          <option>Después del desayuno</option>
          <option>Antes del almuerzo</option>
          <option>Después del almuerzo</option>
          <option>Antes de la merienda</option>
          <option>Después de la merienda</option>
          <option>Antes de la cena</option>
          <option>Después de la cena</option>
        </select>
      </label>
      <label className="field">
        <span>Glucemia (mg/dL)</span>
        <input name="glucemia_mgdl" type="number" min="0" placeholder="Ej. 104" />
      </label>
      <label className="field">
        <span>Carbohidratos (g)</span>
        <input name="carbohidratos_g" type="number" min="0" placeholder="Ej. 45" />
      </label>
      <label className="field">
        <span>Tipo de insulina</span>
        <input name="tipo_insulina" type="text" placeholder="Ej. rápida" />
      </label>
      <label className="field">
        <span>Dosis (unidades)</span>
        <input name="dosis_unidades" type="number" min="0" step="0.1" placeholder="Ej. 4" />
      </label>
    </div>
  );
}

function AppointmentFields() {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Fecha y hora</span>
        <input name="fecha_hora" type="datetime-local" defaultValue={getNowInputValue(1)} required />
      </label>
      <label className="field field-full">
        <span>Motivo</span>
        <textarea name="motivo" rows={4} placeholder="Ej. Control de laboratorio, ajuste de medicación..." required />
      </label>
    </div>
  );
}

function getNowInputValue(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  date.setSeconds(0, 0);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function WeeklyInsightEntryCard({ summary }: { summary: WeeklySummary }) {
  const activeDays = summary.daily.filter((day) => day.count > 0).length;
  const maxAverage = Math.max(...summary.daily.map((day) => day.avg), 1);

  return (
    <article className="weekly-insight-entry-card">
      <div className="weekly-insight-entry-copy">
        <p className="eyebrow">Insight semanal</p>
        <h3>Una lectura inteligente de tu semana.</h3>
        <p>Detectá patrones, momentos sensibles y puntos para conversar con tu médico a partir de tus registros reales.</p>
        <div className="weekly-insight-entry-actions">
          <Link className="primary-button weekly-insight-button" href="/dashboard/insight-semanal">
            Ver insight semanal
          </Link>
          <span>{activeDays}/7 días con datos</span>
        </div>
      </div>

      <div className="weekly-insight-cover" aria-hidden="true">
        <span className="weekly-insight-orbit weekly-insight-orbit-one" />
        <span className="weekly-insight-orbit weekly-insight-orbit-two" />
        <div className="weekly-insight-signal">
          {summary.daily.map((day, index) => {
            const height = day.count ? Math.max(18, (day.avg / maxAverage) * 100) : 12;
            return (
              <i
                className={day.avg > 180 ? "high" : day.avg && day.avg < 70 ? "low" : "normal"}
                style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }}
                key={day.key}
              />
            );
          })}
        </div>
        <div className="weekly-insight-cover-metric">
          <strong>{summary.timeInRange ?? "--"}{summary.timeInRange !== null ? "%" : ""}</strong>
          <span>tiempo en rango</span>
        </div>
      </div>
    </article>
  );
}

function WeeklyGlucoseChart({ summary }: { summary: WeeklySummary }) {
  const { daily, points, yMin, yMax, records } = summary;
  const width = 760;
  const height = 238;
  const xForDay = (index: number) => (index / 6) * width;
  const yForValue = (value: number) => 18 + ((yMax - value) * (height - 34)) / (yMax - yMin || 1);
  const avgPoints = daily
    .map((day, index) => (day.count ? { x: xForDay(index), y: yForValue(day.avg), label: day.label, value: day.avg } : null))
    .filter((point): point is { x: number; y: number; label: string; value: number } => Boolean(point));
  const avgPath = buildSmoothPath(avgPoints);
  const areaPath = buildAreaPath(avgPoints, height);
  const highLineY = yForValue(180);
  const lowLineY = yForValue(70);

  return (
    <div className="weekly-chart-card">
      <div className="chart-heading-row">
        <h3>Análisis estadístico semanal</h3>
        <span>{records.length ? "Últimos 7 días" : "Sin registros"}</span>
      </div>

      {points.length ? (
        <>
          <div className="weekly-chart-metrics">
            <div>
              <span>Promedio</span>
              <strong>{formatMetricValue(summary.avg)} <small>mg/dL</small></strong>
            </div>
            <div>
              <span>En rango</span>
              <strong>{summary.timeInRange ?? "--"}{summary.timeInRange !== null ? <small>%</small> : null}</strong>
            </div>
            <div>
              <span>Registros</span>
              <strong>{records.length}</strong>
            </div>
          </div>

          <div className="weekly-chart-wrap">
            <span className="weekly-range-label weekly-range-high">180</span>
            <span className="weekly-range-label weekly-range-low">70</span>
            <svg className="weekly-glucose-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Resumen estadístico de glucemia de los últimos 7 días">
              <defs>
                <linearGradient id="weeklyGlucoseArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="weekly-chart-range" d={`M0 ${highLineY}H${width}M0 ${lowLineY}H${width}`} />
              {areaPath ? <path className="weekly-glucose-area" d={areaPath} /> : null}
              {avgPath ? <path className="weekly-glucose-line" d={avgPath} /> : null}
              <g className="weekly-chart-points">
                {avgPoints.map((point) => (
                  <circle cx={point.x} cy={point.y} r="6" key={point.label}>
                    <title>{`${point.label}: promedio ${point.value} mg/dL`}</title>
                  </circle>
                ))}
              </g>
            </svg>
          </div>

          <div className="weekly-chart-days" aria-hidden="true">
            {daily.map((day) => <span key={day.key}>{day.shortLabel}</span>)}
          </div>
        </>
      ) : (
        <p className="chart-empty">Cuando cargues registros de glucemia, acá vas a ver la evolución estadística de los últimos 7 días.</p>
      )}
    </div>
  );
}

function WeeklyMetricPanel({ summary }: { summary: WeeklySummary }) {
  return (
    <aside className="weekly-metric-panel" aria-label="Valores informativos semanales">
      <div className="weekly-stat-list">
        <WeeklyMetric label="Promedio glucosa" value={formatMetricValue(summary.avg)} unit="mg/dL" detail={`${summary.records.length} registros`} progress={summary.avg ? normalizeMetric(summary.avg, summary.yMin, summary.yMax) : 0} />
        <WeeklyMetric label="Glucosa máxima" value={formatMetricValue(summary.max)} unit="mg/dL" detail={summary.maxRecord ? formatShortDate(summary.maxRecord.fecha_hora) : "Sin datos"} tone="high" progress={summary.max ? normalizeMetric(summary.max, summary.yMin, summary.yMax) : 0} />
        <WeeklyMetric label="Glucosa mínima" value={formatMetricValue(summary.min)} unit="mg/dL" detail={summary.minRecord ? formatShortDate(summary.minRecord.fecha_hora) : "Sin datos"} tone="low" progress={summary.min ? normalizeMetric(summary.min, summary.yMin, summary.yMax) : 0} />
        <WeeklyMetric label="Hipoglucemias" value={String(summary.hypoglycemiaCount)} detail="<70 mg/dL" tone={summary.hypoglycemiaCount ? "low" : "normal"} progress={Math.min(100, summary.hypoglycemiaCount * 18)} />
        <WeeklyMetric label="Hiperglucemias" value={String(summary.hyperglycemiaCount)} detail=">180 mg/dL" tone={summary.hyperglycemiaCount ? "high" : "normal"} progress={Math.min(100, summary.hyperglycemiaCount * 18)} />
      </div>
    </aside>
  );
}

function WeeklyMetric({ label, value, unit, detail, progress, tone = "neutral" }: { label: string; value: string; unit?: string; detail: string; progress: number; tone?: "neutral" | "normal" | "low" | "high" }) {
  return (
    <article className={`weekly-metric ${tone}`} style={{ "--metric-progress": `${progress}%` } as Record<string, string>}>
      <div>
        <span>{label}</span>
        <em>{detail}</em>
      </div>
      <strong>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
      <i aria-hidden="true" />
    </article>
  );
}

function RangeDistributionChart({ records, compact = false }: { records: PatientRecordChartPoint[]; compact?: boolean }) {
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
      <div className={`chart-card insight-card ${compact ? "weekly-range-card" : ""}`}>
        <div className="chart-heading-row">
          <h3>Tiempo en rango</h3>
          <span>Distribución</span>
        </div>
        <p className="chart-empty">Cuando haya glucemias cargadas, se verá qué proporción queda baja, objetivo o alta.</p>
      </div>
    );
  }

  return (
    <div className={`chart-card insight-card ${compact ? "weekly-range-card" : ""}`}>
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
      {compact ? null : (
        <div className="chart-legend">
          <span><i className="legend-normal" />objetivo</span>
          <span><i className="legend-high" />alta</span>
          <span><i className="legend-low" />baja</span>
        </div>
      )}
    </div>
  );
}

type WeeklyDay = {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  avg: number;
  min: number;
  max: number;
};

type WeeklyChartPoint = {
  id: number;
  date: string;
  dayIndex: number;
  value: number;
};

type WeeklySummary = {
  records: PatientRecordChartPoint[];
  daily: WeeklyDay[];
  points: WeeklyChartPoint[];
  avg: number | null;
  min: number | null;
  max: number | null;
  minRecord: PatientRecordChartPoint | null;
  maxRecord: PatientRecordChartPoint | null;
  timeInRange: number | null;
  hypoglycemiaCount: number;
  hyperglycemiaCount: number;
  yMin: number;
  yMax: number;
  periodLabel: string;
};

function buildWeeklySummary(records: PatientRecordChartPoint[]): WeeklySummary {
  const validRecords = records.filter((record) => Number.isFinite(Number(record.glucemia_mgdl)));
  const anchor = validRecords.at(-1)?.fecha_hora ? startOfDay(new Date(validRecords.at(-1)?.fecha_hora ?? "")) : startOfDay(new Date());
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - 6);
  const endExclusive = new Date(anchor);
  endExclusive.setDate(anchor.getDate() + 1);

  const weeklyRecords = records
    .filter((record) => {
      const date = new Date(record.fecha_hora);
      return !Number.isNaN(date.getTime()) && date >= start && date < endExclusive;
    })
    .toSorted((left, right) => new Date(left.fecha_hora).getTime() - new Date(right.fecha_hora).getTime());
  const weeklyValues = weeklyRecords.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);
  const minRecord = findExtremeRecord(weeklyRecords, "min");
  const maxRecord = findExtremeRecord(weeklyRecords, "max");
  const min = weeklyValues.length ? Math.min(...weeklyValues) : null;
  const max = weeklyValues.length ? Math.max(...weeklyValues) : null;
  const avg = weeklyValues.length ? Math.round(weeklyValues.reduce((sum, value) => sum + value, 0) / weeklyValues.length) : null;
  const inRangeCount = weeklyValues.filter((value) => value >= 70 && value <= 180).length;
  const hypoglycemiaCount = weeklyValues.filter((value) => value < 70).length;
  const hyperglycemiaCount = weeklyValues.filter((value) => value > 180).length;
  const yMin = Math.max(40, Math.floor((Math.min(60, min ?? 70) - 15) / 10) * 10);
  const yMax = Math.min(320, Math.ceil((Math.max(220, max ?? 180) + 15) / 10) * 10);
  const daily = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const dayRecords = weeklyRecords.filter((record) => isSameDay(new Date(record.fecha_hora), day));
    const values = dayRecords.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);
    return {
      key: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" }),
      shortLabel: day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", ""),
      count: values.length,
      avg: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0
    };
  });
  const points = weeklyRecords
    .map((record) => {
      const date = new Date(record.fecha_hora);
      const dayIndex = Math.max(0, Math.min(6, Math.floor((startOfDay(date).getTime() - start.getTime()) / 86_400_000)));
      return { id: record.id_registro, date: record.fecha_hora, dayIndex, value: Number(record.glucemia_mgdl) };
    })
    .filter((point) => Number.isFinite(point.value));

  return {
    records: weeklyRecords,
    daily,
    points,
    avg,
    min,
    max,
    minRecord,
    maxRecord,
    timeInRange: weeklyValues.length ? Math.round((inRangeCount / weeklyValues.length) * 100) : null,
    hypoglycemiaCount,
    hyperglycemiaCount,
    yMin,
    yMax,
    periodLabel: `${formatShortDate(start.toISOString())} - ${formatShortDate(anchor.toISOString())}`
  };
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (points.length < 2) return "";
  const linePath = buildSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
}

function findExtremeRecord(records: PatientRecordChartPoint[], type: "min" | "max") {
  return records.reduce<PatientRecordChartPoint | null>((selected, record) => {
    const value = Number(record.glucemia_mgdl);
    if (!Number.isFinite(value)) return selected;
    if (!selected) return record;
    const selectedValue = Number(selected.glucemia_mgdl);
    return type === "min" ? (value < selectedValue ? record : selected) : value > selectedValue ? record : selected;
  }, null);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function formatMetricValue(value: number | null) {
  return value === null ? "--" : String(value);
}

function normalizeMetric(value: number, min: number, max: number) {
  return Math.max(4, Math.min(100, ((value - min) * 100) / (max - min || 1)));
}

function formatShortDate(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
