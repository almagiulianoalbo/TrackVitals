"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getInitials } from "@/components/DashboardChrome";
import { PatientLinkFields } from "@/components/PatientLinkFields";
import { formatDateTime } from "@/lib/dashboard-format";
import { readRecentPatientIds, rememberRecentPatient } from "@/lib/recent-patients";

type ModalType = "patient" | "prescription" | "appointment";
type RangeKey = "7d" | "1m" | "3m";

export type DoctorPatientPreview = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string | null;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  tipo_diabetes: string | null;
};

type SubmitState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

type PatientSummary = {
  patient: DoctorPatientPreview & {
    telefono: string | null;
  };
  range: RangeKey;
  anchorDate: string | null;
  records: PatientRecord[];
};

type PatientRecord = {
  id_registro: number;
  fecha_hora: string;
  momento: string | null;
  glucemia_mgdl: number | null;
  carbohidratos_g: number | null;
  tipo_insulina: string | null;
  dosis_unidades: number | string | null;
};

type SummaryState = {
  loading: boolean;
  error: string | null;
  data: PatientSummary | null;
};

const initialState: SubmitState = {
  loading: false,
  message: null,
  error: null
};

export function DoctorDashboardPanel({
  patients,
  patientsCount,
  alertCount
}: {
  patients: DoctorPatientPreview[];
  patientsCount: number;
  alertCount: number;
}) {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(initialState);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(patients[0]?.id_paciente ?? null);
  const [recentPatientIds, setRecentPatientIds] = useState<number[]>([]);
  const [range, setRange] = useState<RangeKey>("7d");
  const [summaryState, setSummaryState] = useState<SummaryState>({ loading: false, error: null, data: null });
  const router = useRouter();
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id_paciente === selectedPatientId) ?? patients[0] ?? null,
    [patients, selectedPatientId]
  );
  const selectedPatientName = selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellido}` : "Sin pacientes asignados";
  const orderedQuickPatients = useMemo(() => orderPatientsByLocalRecency(patients, recentPatientIds), [patients, recentPatientIds]);
  const patientIdsKey = useMemo(() => patients.map((patient) => patient.id_paciente).join("|"), [patients]);
  const records = summaryState.data?.records ?? [];
  const metrics = useMemo(() => buildMetrics(records), [records]);

  useEffect(() => {
    const nextRecentPatientIds = readRecentPatientIds();
    setRecentPatientIds(nextRecentPatientIds);

    const availablePatientIds = new Set(patientIdsKey.split("|").map(Number).filter((patientId) => Number.isSafeInteger(patientId) && patientId > 0));
    const lastAvailablePatientId = nextRecentPatientIds.find((patientId) => availablePatientIds.has(patientId));

    if (lastAvailablePatientId) {
      setSelectedPatientId((currentPatientId) =>
        currentPatientId === lastAvailablePatientId ? currentPatientId : lastAvailablePatientId
      );
    }
  }, [patientIdsKey]);

  useEffect(() => {
    if (!selectedPatientId && patients[0]) {
      setSelectedPatientId(patients[0].id_paciente);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setSummaryState({ loading: false, error: null, data: null });
      return;
    }

    const controller = new AbortController();
    setSummaryState((current) => ({ ...current, loading: true, error: null }));

    fetch(`/api/dashboard/paciente-resumen?id_paciente=${selectedPatientId}&rango=${range}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as PatientSummary | { error?: string };

        if (!response.ok) {
          throw new Error("error" in data && data.error ? data.error : "No se pudo cargar el resumen.");
        }

        setSummaryState({ loading: false, error: null, data: data as PatientSummary });
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setSummaryState({ loading: false, error: error.message, data: null });
      });

    return () => controller.abort();
  }, [selectedPatientId, range]);

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

  function selectPatient(patientId: number) {
    setSelectedPatientId(patientId);
    setRecentPatientIds(rememberRecentPatient(patientId));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeModal) return;

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const endpointByModal: Record<ModalType, string> = {
      patient: "/api/dashboard/pacientes",
      prescription: "/api/dashboard/prescripciones",
      appointment: "/api/dashboard/turnos"
    };
    const fallbackError = getModalFallbackError(activeModal);

    setSubmitState({ loading: true, message: null, error: null });

    try {
      const response = await fetch(endpointByModal[activeModal], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setSubmitState({ loading: false, message: null, error: data.error ?? fallbackError });
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
      <section className="metric-grid" aria-label="Acciones rápidas">
        <ActionMetricCard label="Agregar paciente" value="+" status={`${patientsCount} pacientes vinculados`} onClick={() => openModal("patient")} />
        <LinkMetricCard
          href="/dashboard/alertas"
          label="Alertas"
          value={String(alertCount)}
          status={alertCount ? "Alertas registradas" : "Sin alertas críticas"}
          tone="danger"
        />
        <ActionMetricCard label="Crear prescripción" value="+" status="Medicamentos e indicaciones" onClick={() => openModal("prescription")} />
        <ActionMetricCard label="Agenda" value="+" status="Agendar turno" onClick={() => openModal("appointment")} />
      </section>

      <section className="clinical-grid doctor-overview-grid">
        <article className="dashboard-card patient-focus">
          <div className="doctor-patient-top">
            <div className="doctor-patient-summary">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Paciente seleccionado</p>
                  <div className="selected-patient-title">
                    {selectedPatient ? (
                      <span className="selected-patient-photo" aria-hidden="true">
                        {selectedPatient.foto_url ? (
                          <img src={selectedPatient.foto_url} alt="" />
                        ) : (
                          getInitials(selectedPatientName)
                        )}
                      </span>
                    ) : null}
                    <h2>{selectedPatientName}</h2>
                  </div>
                </div>
                <div className="period-tabs" aria-label="Rango de análisis">
                  <button className={range === "7d" ? "active" : ""} type="button" onClick={() => setRange("7d")}>
                    7 días
                  </button>
                  <button className={range === "1m" ? "active" : ""} type="button" onClick={() => setRange("1m")}>
                    1 mes
                  </button>
                  <button className={range === "3m" ? "active" : ""} type="button" onClick={() => setRange("3m")}>
                    3 meses
                  </button>
                </div>
              </div>

              <div className="patient-profile-card">
                <div className="patient-row">
                  <span className="avatar-badge" aria-hidden="true">
                    {selectedPatient?.foto_url ? (
                      <img src={selectedPatient.foto_url} alt="" />
                    ) : selectedPatient ? (
                      getInitials(`${selectedPatient.nombre} ${selectedPatient.apellido}`)
                    ) : (
                      "--"
                    )}
                  </span>
                  <div>
                    <strong>{selectedPatient ? formatDiabetes(selectedPatient.tipo_diabetes) : "Vinculá pacientes para comenzar"}</strong>
                    <span>
                      {selectedPatient ? (
                        <>
                          {formatAge(selectedPatient.fecha_nacimiento)} · {selectedPatient.email ?? "Email pendiente"}
                          {summaryState.data?.patient.telefono ? ` · ${summaryState.data.patient.telefono}` : ""}
                        </>
                      ) : (
                        "Los pacientes aparecerán cuando tengan tu ID como médico de cabecera."
                      )}
                    </span>
                  </div>
                </div>

                {summaryState.error ? <p className="form-error">{summaryState.error}</p> : null}

                <div className="clinical-metrics">
                  <MetricCard label="Glucemia" value={summaryState.loading ? "--" : metrics.latestGlucose} unit={metrics.latestGlucose !== "--" ? "mg/dL" : undefined} status={metrics.glucoseStatus} compact />
                  <MetricCard label="Promedio" value={summaryState.loading ? "--" : metrics.averageGlucose} unit={metrics.averageGlucose !== "--" ? "mg/dL" : undefined} status={rangeLabel(range)} compact />
                  <MetricCard label="Última insulina" value={summaryState.loading ? "--" : metrics.latestInsulin} unit={metrics.latestInsulin !== "--" ? "u" : undefined} status={metrics.insulinStatus} compact />
                  <MetricCard label="Registros" value={summaryState.loading ? "--" : String(records.length)} status={rangeLabel(range)} compact />
                </div>
              </div>
            </div>

            <QuickPatientList patients={orderedQuickPatients} selectedPatient={selectedPatient} onSelect={selectPatient} />
          </div>

          <div className="chart-grid doctor-chart-grid">
            {summaryState.loading ? (
              <>
                <ChartLoading title="Glucemia" />
                <ChartLoading title="Registros cargados" />
              </>
            ) : (
              <>
                <GlucoseLineChart records={records} range={range} anchorDate={summaryState.data?.anchorDate ?? null} />
                <RecordsBarChart records={records} range={range} anchorDate={summaryState.data?.anchorDate ?? null} />
              </>
            )}
          </div>
        </article>
      </section>

      {activeModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="doctor-action-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acción rápida</p>
                <h2 id="doctor-action-title">{getModalTitle(activeModal)}</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} disabled={submitState.loading} aria-label="Cerrar">
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={submitForm}>
              {activeModal === "patient" ? <PatientLinkFields /> : null}
              {activeModal === "prescription" ? <PrescriptionFields patients={patients} /> : null}
              {activeModal === "appointment" ? <AppointmentFields patients={patients} selectedPatientId={selectedPatient?.id_paciente ?? null} /> : null}

              {submitState.error ? <p className="form-error">{submitState.error}</p> : null}
              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={submitState.loading}>
                  {submitState.loading ? "Guardando..." : getModalSubmitLabel(activeModal)}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function QuickPatientList({
  patients,
  selectedPatient,
  onSelect
}: {
  patients: DoctorPatientPreview[];
  selectedPatient: DoctorPatientPreview | null;
  onSelect: (patientId: number) => void;
}) {
  return (
    <aside className="dashboard-card stacked-card quick-patient-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lista rápida</p>
          <h2>Mis pacientes</h2>
        </div>
      </div>

      <div className="patient-list quick-patient-list">
        {patients.length ? (
          patients.slice(0, 4).map((patient) => (
            <button
              className={`patient-list-item selectable ${patient.id_paciente === selectedPatient?.id_paciente ? "active" : ""}`}
              type="button"
              onClick={() => onSelect(patient.id_paciente)}
              key={patient.id_paciente}
            >
              <span className="avatar-badge small" aria-hidden="true">
                {patient.foto_url ? <img src={patient.foto_url} alt="" /> : getInitials(`${patient.nombre} ${patient.apellido}`)}
              </span>
              <div>
                <strong>
                  {patient.nombre} {patient.apellido}
                </strong>
                <small>{patient.email ?? "Email pendiente"}</small>
              </div>
            </button>
          ))
        ) : (
          <p className="empty-state">Todavía no hay pacientes vinculados.</p>
        )}
      </div>
    </aside>
  );
}

function orderPatientsByLocalRecency(patients: DoctorPatientPreview[], recentPatientIds: number[]) {
  if (!recentPatientIds.length) return patients;

  const recentIndex = new Map(recentPatientIds.map((patientId, index) => [patientId, index]));

  return [...patients].sort((left, right) => {
    const leftIndex = recentIndex.get(left.id_paciente);
    const rightIndex = recentIndex.get(right.id_paciente);

    if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
    if (leftIndex !== undefined) return -1;
    if (rightIndex !== undefined) return 1;
    return 0;
  });
}

function AppointmentFields({ patients, selectedPatientId }: { patients: DoctorPatientPreview[]; selectedPatientId: number | null }) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Paciente</span>
        <select name="id_paciente" required defaultValue={selectedPatientId ?? ""}>
          <option value="" disabled>
            Seleccionar paciente
          </option>
          {patients.map((patient) => (
            <option value={patient.id_paciente} key={patient.id_paciente}>
              {patient.nombre} {patient.apellido} - ID: {patient.id_paciente}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Fecha y hora</span>
        <input name="fecha_hora" type="datetime-local" defaultValue={getNowInputValue(1)} required />
      </label>
      <label className="field field-full">
        <span>Motivo</span>
        <textarea name="motivo" rows={4} placeholder="Ej. Control de laboratorio, ajuste de tratamiento..." required />
      </label>
    </div>
  );
}

function PrescriptionFields({ patients }: { patients: DoctorPatientPreview[] }) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Paciente</span>
        <select name="id_paciente" required defaultValue="">
          <option value="" disabled>
            Seleccionar paciente
          </option>
          {patients.map((patient) => (
            <option value={patient.id_paciente} key={patient.id_paciente}>
              {patient.nombre} {patient.apellido}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Medicamento</span>
        <input name="medicamento" type="text" placeholder="Ej. Metformina" required />
      </label>
      <label className="field">
        <span>Dosis</span>
        <input name="dosis" type="number" min="0" step="0.1" placeholder="Ej. 500" required />
      </label>
      <label className="field">
        <span>Unidad</span>
        <select name="unidad" defaultValue="mg">
          <option value="mg">mg</option>
          <option value="g">g</option>
          <option value="mcg">mcg</option>
          <option value="ml">ml</option>
          <option value="UI">UI</option>
          <option value="unidades">unidades</option>
          <option value="comprimidos">comprimidos</option>
        </select>
      </label>
      <label className="field">
        <span>Frecuencia</span>
        <input name="frecuencia" type="text" placeholder="Ej. Cada 12 hs" required />
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
      <label className="field field-full">
        <span>Indicaciones</span>
        <textarea name="indicaciones" rows={4} placeholder="Indicaciones para el paciente" />
      </label>
    </div>
  );
}

function getModalTitle(type: ModalType) {
  if (type === "patient") return "Agregar paciente";
  if (type === "prescription") return "Crear prescripción";
  return "Agregar turno";
}

function getModalSubmitLabel(type: ModalType) {
  if (type === "patient") return "Agregar paciente";
  if (type === "prescription") return "Crear prescripción";
  return "Agregar turno";
}

function getModalFallbackError(type: ModalType) {
  if (type === "patient") return "No se pudo agregar el paciente.";
  if (type === "prescription") return "No se pudo crear la prescripción.";
  return "No se pudo crear el turno.";
}

function getNowInputValue(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  date.setSeconds(0, 0);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
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
      <strong className={value.length > 2 ? "subdued-value" : ""}>{value}</strong>
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

function GlucoseLineChart({ records, range, anchorDate }: { records: PatientRecord[]; range: RangeKey; anchorDate: string | null }) {
  const readings = records
    .map((record) => {
      const value = Number(record.glucemia_mgdl);
      const date = new Date(record.fecha_hora);
      return Number.isFinite(value) && !Number.isNaN(date.getTime()) ? { date, value } : null;
    })
    .filter((reading): reading is { date: Date; value: number } => Boolean(reading))
    .toSorted((left, right) => left.date.getTime() - right.date.getTime());

  const values = readings.map((reading) => reading.value);
  const rawMin = Math.min(...values, 70);
  const rawMax = Math.max(...values, 180);
  const yMin = Math.max(40, Math.floor((rawMin - 14) / 10) * 10);
  const yMax = Math.ceil((rawMax + 14) / 10) * 10;
  const width = 920;
  const height = 280;
  const padding = { left: 52, right: 28, top: 26, bottom: 40 };
  const firstTime = readings[0]?.date.getTime() ?? 0;
  const lastTime = readings.at(-1)?.date.getTime() ?? firstTime;
  const timeRange = Math.max(lastTime - firstTime, 1);
  const yForValue = (value: number) =>
    padding.top + ((yMax - value) * (height - padding.top - padding.bottom)) / (yMax - yMin || 1);
  const points = readings.map((reading) => {
    const x = readings.length === 1
      ? padding.left + (width - padding.left - padding.right) / 2
      : padding.left + ((reading.date.getTime() - firstTime) / timeRange) * (width - padding.left - padding.right);

    return {
      x,
      y: yForValue(reading.value),
      value: reading.value,
      date: reading.date,
      tone: getGlucoseTone(reading.value)
    };
  });
  const linePath = buildSmoothPath(points);
  const areaPath = buildAreaPath(points, height - padding.bottom);
  const highLineY = yForValue(180);
  const lowLineY = yForValue(70);
  const rangeTop = Math.min(highLineY, lowLineY);
  const rangeHeight = Math.abs(lowLineY - highLineY);

  return (
    <div className="chart-card doctor-glucose-chart-card">
      <div className="chart-heading-row">
        <h3>Glucemia</h3>
        <span>{anchorDate ? `${rangeLabel(range)} hasta ${formatShortDate(anchorDate)}` : rangeLabel(range)}</span>
      </div>
      {points.length ? (
        <>
          <svg className="doctor-glucose-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Glucemia del paciente seleccionado">
            <defs>
              <linearGradient id="doctorGlucoseArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1575ba" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#1575ba" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect className="doctor-glucose-target" x={padding.left} y={rangeTop} width={width - padding.left - padding.right} height={rangeHeight} rx="10" />
            <path className="chart-grid-line" d={`M${padding.left} ${padding.top}H${width - padding.right}M${padding.left} ${highLineY}H${width - padding.right}M${padding.left} ${lowLineY}H${width - padding.right}M${padding.left} ${height - padding.bottom}H${width - padding.right}`} />
            {areaPath ? <path className="doctor-glucose-area" d={areaPath} /> : null}
            {linePath ? <path className="doctor-glucose-line smooth-line" d={linePath} /> : null}
            <g className="chart-axis-labels">
              <text x="8" y={padding.top + 4}>{yMax}</text>
              <text x="8" y={highLineY + 4}>180</text>
              <text x="8" y={lowLineY + 4}>70</text>
              <text x="8" y={height - padding.bottom + 4}>{yMin}</text>
            </g>
            <g className="chart-dots">
              {points.map((point, index) => (
                <circle className={`chart-dot-${point.tone}`} cx={point.x} cy={point.y} r="5" key={`${point.date.toISOString()}-${point.value}-${index}`}>
                  <title>{`${formatDateTime(point.date.toISOString())}: ${point.value} mg/dL`}</title>
                </circle>
              ))}
            </g>
          </svg>
          <div className="doctor-glucose-footer" aria-hidden="true">
            <span>{formatShortDate(points[0]?.date.toISOString())}</span>
            <span>Rango objetivo 70-180 mg/dL</span>
            <span>{formatShortDate(points.at(-1)?.date.toISOString())}</span>
          </div>
        </>
      ) : (
        <p className="chart-empty">Sin registros de glucemia en este rango.</p>
      )}
    </div>
  );
}

function RecordsBarChart({ records, range, anchorDate }: { records: PatientRecord[]; range: RangeKey; anchorDate: string | null }) {
  const buckets = buildBuckets(records, range, anchorDate);
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="chart-card">
      <div className="chart-heading-row">
        <h3>Registros cargados</h3>
        <span>{anchorDate ? `Hasta ${formatShortDate(anchorDate)}` : rangeLabel(range)}</span>
      </div>
      <div className="adherence-chart compact-record-chart" aria-label="Registros cargados por periodo">
        {buckets.map((bucket) => (
          <div className="adherence-bar" key={bucket.label}>
            <span style={{ height: `${Math.max((bucket.count / maxCount) * 100, bucket.count ? 14 : 0)}%` }} />
            <strong>{bucket.label}</strong>
            <small>{bucket.count}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLoading({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <div className="chart-heading-row">
        <h3>{title}</h3>
        <span>Cargando</span>
      </div>
      <div className="loading-panel chart-loading-panel" aria-hidden="true">
        <span className="loading-line large" />
        <span className="loading-line" />
        <span className="loading-line short" />
      </div>
    </div>
  );
}

function buildMetrics(records: PatientRecord[]) {
  const latestGlucoseRecord = [...records].reverse().find((record) => record.glucemia_mgdl !== null);
  const glucoseValues = records.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);
  const latestInsulinRecord = [...records].reverse().find((record) => record.dosis_unidades !== null);
  const average = glucoseValues.length ? Math.round(glucoseValues.reduce((sum, value) => sum + value, 0) / glucoseValues.length) : null;

  return {
    latestGlucose: latestGlucoseRecord?.glucemia_mgdl ? String(latestGlucoseRecord.glucemia_mgdl) : "--",
    averageGlucose: average ? String(average) : "--",
    latestInsulin: latestInsulinRecord?.dosis_unidades ? String(latestInsulinRecord.dosis_unidades) : "--",
    glucoseStatus: latestGlucoseRecord ? formatShortDate(latestGlucoseRecord.fecha_hora) : "Sin registros",
    insulinStatus: latestInsulinRecord?.tipo_insulina ?? (latestInsulinRecord ? formatShortDate(latestInsulinRecord.fecha_hora) : "Sin carga")
  };
}

function buildBuckets(records: PatientRecord[], range: RangeKey, anchorDate: string | null) {
  const anchor = anchorDate ? new Date(anchorDate) : getLatestRecordDate(records);
  const now = Number.isNaN(anchor.getTime()) ? new Date() : anchor;

  if (range === "7d") {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        label: ["D", "L", "M", "X", "J", "V", "S"][date.getDay()],
        count: records.filter((record) => record.fecha_hora.slice(0, 10) === key).length
      };
    });
  }

  const bucketCount = range === "1m" ? 4 : 3;
  const daysPerBucket = range === "1m" ? 7 : 30;

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(now);
    start.setDate(now.getDate() - daysPerBucket * (bucketCount - index));
    const end = new Date(now);
    end.setDate(now.getDate() - daysPerBucket * (bucketCount - index - 1));

    return {
      label: range === "1m" ? `S${index + 1}` : `M${index + 1}`,
      count: records.filter((record) => {
        const date = new Date(record.fecha_hora);
        return date >= start && date <= end;
      }).length
    };
  });
}

function getLatestRecordDate(records: PatientRecord[]) {
  const latest = records
    .map((record) => new Date(record.fecha_hora))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ?? new Date();
}

function rangeLabel(range: RangeKey) {
  const labels: Record<RangeKey, string> = {
    "7d": "Últimos 7 días",
    "1m": "Último mes",
    "3m": "Últimos 3 meses"
  };

  return labels[range];
}

function formatShortDate(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
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

function getGlucoseTone(value: number) {
  if (value < 70) return "low";
  if (value > 180) return "high";
  return "normal";
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, "");
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (points.length < 2) return "";
  const line = buildSmoothPath(points);
  const first = points[0];
  const last = points.at(-1)!;
  return `${line} L${last.x.toFixed(1)} ${baseline.toFixed(1)} L${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
}
