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
};

export function PatientDashboardPanel({ nextAppointmentValue, nextAppointmentStatus, alertCount }: PatientDashboardPanelProps) {
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

  function closeModal() {
    if (!submitState.loading) {
      setActiveModal(null);
      setSubmitState(initialState);
    }
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
      setSubmitState({ loading: false, message: data.message ?? "Guardado correctamente.", error: null });
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
            <MiniLineChart title="Tendencia de glucemia" />
            <MiniBarChart title="Adherencia semanal" />
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
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="quick-action-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acción rápida</p>
                <h2 id="quick-action-title">{modalTitle}</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Cerrar">
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={submitForm}>
              {activeModal === "record" ? <RecordFields /> : null}
              {activeModal === "appointment" ? <AppointmentFields /> : null}
              {activeModal === "medication" ? <MedicationFields /> : null}

              {submitState.error ? <p className="form-error">{submitState.error}</p> : null}
              {submitState.message ? <p className="form-success">{submitState.message}</p> : null}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={submitState.loading}>
                  Cancelar
                </button>
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
