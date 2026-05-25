"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ModalType = "record" | "appointment" | "medication";

type SubmitState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

const initialState: SubmitState = {
  loading: false,
  message: null,
  error: null
};

type PatientDashboardPanelProps = {
  nextAppointmentValue: string;
  nextAppointmentStatus: string;
  alertCount: number;
  records: PatientRecordChartPoint[];
};

type PatientRecordChartPoint = {
  id_registro: number;
  fecha_hora: string;
  glucemia_mgdl: number | null;
};

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function PatientDashboardPanel({ nextAppointmentValue, nextAppointmentStatus, alertCount, records }: PatientDashboardPanelProps) {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(initialState);
  const router = useRouter();

  const modalTitle = useMemo(() => {
    if (activeModal === "record") return "Crear registro";
    if (activeModal === "appointment") return "Pedir turno";
    if (activeModal === "medication") return "Cargar medicación";
    return "";
  }, [activeModal]);

  function openModal(type: ModalType) {
    setSubmitState(initialState);
    setActiveModal(type);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeModal) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const endpointByModal: Record<ModalType, string> = {
      record: "/api/dashboard/registros-diarios",
      appointment: "/api/dashboard/turnos",
      medication: "/api/dashboard/medicamentos"
    };

    setSubmitState({ loading: true, message: null, error: null });

    try {
      const response = await fetch(endpointByModal[activeModal], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setSubmitState({ loading: false, message: null, error: data.error ?? "No se pudo guardar." });
        return;
      }

      form.reset();
      setActiveModal(null);
      setSubmitState(initialState);
      router.refresh();
    } catch {
      setSubmitState({ loading: false, message: null, error: "No se pudo conectar con el servidor." });
    }
  }

  return (
    <div className="dashboard-content">
      <section className="clinical-grid patient-main-grid">
        <article className="dashboard-card patient-focus">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Registro diario</p>
              <h2>Control de hoy</h2>
            </div>
            <button className="inline-action" type="button" onClick={() => openModal("record")}>
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
            <GlucoseLineChart records={records} />
            <AdherenceBarChart records={records} />
          </div>
        </article>
      </section>

      <section className="metric-grid" aria-label="Resumen del paciente">
        <ActionMetricCard label="Pedir turno" value="+" status="Control con tu médico" onClick={() => openModal("appointment")} />
        <ActionMetricCard label="Cargar medicación" value="+" status="Dosis y horario" onClick={() => openModal("medication")} />
        <MetricCard label="Próximo control" value={nextAppointmentValue} status={nextAppointmentStatus} subduedValue={nextAppointmentValue !== "--"} />
        <LinkMetricCard
          href="/dashboard/alertas"
          label="Alertas"
          value={String(alertCount)}
          status={alertCount ? "Alertas sin ver" : "Sin alertas activas"}
          tone="danger"
        />
      </section>

      {activeModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="quick-action-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acción rápida</p>
                <h2 id="quick-action-title">{modalTitle}</h2>
              </div>
            </div>

            <form className="modal-form" onSubmit={submitForm}>
              {activeModal === "record" ? <RecordFields /> : null}
              {activeModal === "appointment" ? <AppointmentFields /> : null}
              {activeModal === "medication" ? <MedicationFields /> : null}

              {submitState.error ? <p className="form-error">{submitState.error}</p> : null}
              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={submitState.loading}>
                  {submitState.loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function RecordFields() {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Fecha y hora</span>
        <input name="fecha_hora" type="datetime-local" required />
      </label>
      <label className="field">
        <span>Momento</span>
        <select name="momento">
          <option value="">Seleccionar</option>
          <option value="Ayunas">Ayunas</option>
          <option value="Antes de comer">Antes de comer</option>
          <option value="Después de comer">Después de comer</option>
          <option value="Antes de dormir">Antes de dormir</option>
        </select>
      </label>
      <label className="field">
        <span>Glucemia</span>
        <input name="glucemia_mgdl" type="number" min="0" step="1" placeholder="mg/dL" />
      </label>
      <label className="field">
        <span>Carbohidratos</span>
        <input name="carbohidratos_g" type="number" min="0" step="1" placeholder="g" />
      </label>
      <label className="field">
        <span>Tipo de insulina</span>
        <input name="tipo_insulina" type="text" placeholder="Ej. Glargina" />
      </label>
      <label className="field">
        <span>Dosis</span>
        <input name="dosis_unidades" type="number" min="0" step="0.1" placeholder="unidades" />
      </label>
    </div>
  );
}

function AppointmentFields() {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Fecha y hora</span>
        <input name="fecha_hora" type="datetime-local" required />
      </label>
      <label className="field field-full">
        <span>Motivo</span>
        <select name="motivo" required defaultValue="">
          <option value="" disabled>
            Seleccionar motivo
          </option>
          <option value="Control de rutina">Control de rutina</option>
          <option value="Consulta por síntomas">Consulta por síntomas</option>
          <option value="Ajuste de medicación">Ajuste de medicación</option>
          <option value="Renovación de receta">Renovación de receta</option>
          <option value="Revisión de estudios">Revisión de estudios</option>
        </select>
      </label>
    </div>
  );
}

function MedicationFields() {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Nombre</span>
        <input name="nombre" type="text" required />
      </label>
      <label className="field">
        <span>Dosis</span>
        <input name="dosis" type="number" min="0" step="0.01" />
      </label>
      <label className="field">
        <span>Unidad</span>
        <input name="unidad" type="text" placeholder="mg, unidades..." />
      </label>
      <label className="field">
        <span>Frecuencia</span>
        <input name="frecuencia" type="text" placeholder="Cada 12 hs" />
      </label>
      <label className="field">
        <span>Fecha inicio</span>
        <input name="fecha_inicio" type="date" />
      </label>
      <label className="field">
        <span>Fecha fin</span>
        <input name="fecha_fin" type="date" />
      </label>
      <label className="field">
        <span>Estado</span>
        <select name="estado" defaultValue="activa">
          <option value="activa">Activa</option>
          <option value="pausada">Pausada</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </label>
    </div>
  );
}

function ActionMetricCard({ label, value, status, onClick }: { label: string; value: string; status: string; onClick: () => void }) {
  return (
    <button className="metric-card action-metric-card" type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{status}</em>
    </button>
  );
}

function LinkMetricCard({
  href,
  label,
  value,
  status,
  tone = "neutral"
}: {
  href: string;
  label: string;
  value: string;
  status: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Link className={`metric-card action-metric-card link-metric-card ${tone === "danger" ? "danger" : ""}`} href={href}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{status}</em>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  unit,
  status,
  tone = "neutral",
  compact = false,
  subduedValue = false
}: {
  label: string;
  value: string;
  unit?: string;
  status: string;
  tone?: "neutral" | "danger";
  compact?: boolean;
  subduedValue?: boolean;
}) {
  return (
    <article className={`metric-card ${compact ? "compact" : ""} ${tone === "danger" ? "danger" : ""}`}>
      <span>{label}</span>
      <strong className={subduedValue ? "subdued-value" : ""}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
      <em>{status}</em>
    </article>
  );
}

function GlucoseLineChart({ records }: { records: PatientRecordChartPoint[] }) {
  const glucoseRecords = records.filter((record) => typeof record.glucemia_mgdl === "number").slice(-12);
  const chart = buildGlucoseChart(glucoseRecords);

  return (
    <div className="chart-card">
      <div className="chart-heading-row">
        <h3>Evolución de glucemia</h3>
        <span>mg/dL</span>
      </div>
      <svg viewBox="0 0 320 170" role="img" aria-label="Evolución de glucemia en el tiempo">
        <rect className="glucose-band low" x="34" y={chart.yFor(70)} width="258" height={chart.bottom - chart.yFor(70)} />
        <rect className="glucose-band normal" x="34" y={chart.yFor(180)} width="258" height={chart.yFor(70) - chart.yFor(180)} />
        <rect className="glucose-band high" x="34" y={chart.top} width="258" height={chart.yFor(180) - chart.top} />
        <path className="chart-grid-line" d="M34 34H292M34 74H292M34 114H292M34 144H292" />
        <path className="glucose-reference low-line" d={`M34 ${chart.yFor(70)}H292`} />
        <path className="glucose-reference high-line" d={`M34 ${chart.yFor(180)}H292`} />
        {chart.points.length ? <path className="chart-line smooth-line" d={chart.path} /> : null}
        <g className="chart-dots">
          {chart.points.map((point) => (
            <circle cx={point.x} cy={point.y} r="4" key={point.key} />
          ))}
        </g>
        <g className="chart-axis-labels">
          <text x="34" y="162">
            {chart.firstLabel}
          </text>
          <text x="292" y="162" textAnchor="end">
            {chart.lastLabel}
          </text>
        </g>
      </svg>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-low" />Bajo</span>
        <span><i className="legend-normal" />Normal</span>
        <span><i className="legend-high" />Alto</span>
      </div>
      {!chart.points.length ? <p className="chart-empty">Sin mediciones de glucemia.</p> : null}
    </div>
  );
}

function AdherenceBarChart({ records }: { records: PatientRecordChartPoint[] }) {
  const bars = buildAdherenceBars(records);
  const maxCount = Math.max(1, ...bars.map((bar) => bar.count));

  return (
    <div className="chart-card">
      <div className="chart-heading-row">
        <h3>Adherencia semanal</h3>
        <span>registros</span>
      </div>
      <div className="bar-chart adherence-chart" aria-label="Adherencia semanal por cantidad de registros cargados">
        {bars.map((bar) => (
          <div className="adherence-bar" key={bar.day}>
            <span style={{ height: `${bar.count ? Math.max(12, (bar.count / maxCount) * 100) : 0}%` }} />
            <strong>{bar.day}</strong>
            <small>{bar.count}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildGlucoseChart(records: PatientRecordChartPoint[]) {
  const top = 16;
  const bottom = 144;
  const left = 34;
  const right = 292;
  const values = records.map((record) => Number(record.glucemia_mgdl));
  const minValue = Math.min(60, ...values);
  const maxValue = Math.max(220, ...values);
  const range = Math.max(1, maxValue - minValue);
  const yFor = (value: number) => bottom - ((value - minValue) / range) * (bottom - top);
  const points = records.map((record, index) => {
    const x = records.length === 1 ? (left + right) / 2 : left + (index / (records.length - 1)) * (right - left);
    const y = yFor(Number(record.glucemia_mgdl));

    return {
      x,
      y,
      key: record.id_registro
    };
  });

  return {
    top,
    bottom,
    yFor,
    points,
    path: toSmoothPath(points),
    firstLabel: records[0] ? formatShortDate(records[0].fecha_hora) : "",
    lastLabel: records.at(-1) ? formatShortDate(records.at(-1)?.fecha_hora) : ""
  };
}

function toSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAdherenceBars(records: PatientRecordChartPoint[]) {
  const anchor = records.at(-1)?.fecha_hora ? new Date(records.at(-1)?.fecha_hora ?? "") : new Date();
  const monday = new Date(anchor);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  return WEEK_DAYS.map((weekDay, index) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    return {
      day: weekDay,
      count: records.filter((record) => {
        const date = new Date(record.fecha_hora);
        return date >= dayStart && date < dayEnd;
      }).length
    };
  });
}

function formatShortDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
