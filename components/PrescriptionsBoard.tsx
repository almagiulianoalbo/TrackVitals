"use client";

import { useMemo, useState } from "react";
import { formatDate, formatPatientName, formatValue } from "@/lib/dashboard-format";

type PatientName = { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;

export type PrescriptionBoardRow = {
  id_prescripcion: number;
  titulo: string | null;
  indicaciones: string | null;
  medicamento: string | null;
  dosis: number | string | null;
  unidad: string | null;
  frecuencia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  pacientes?: PatientName;
};

type StatusFilter = "todas" | "activa" | "pausada" | "finalizada";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "activa", label: "Activas" },
  { value: "pausada", label: "Pausadas" },
  { value: "finalizada", label: "Finalizadas" }
];

export function PrescriptionsBoard({ prescriptions }: { prescriptions: PrescriptionBoardRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [selectedId, setSelectedId] = useState<number | null>(prescriptions[0]?.id_prescripcion ?? null);

  const filteredPrescriptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return prescriptions.filter((prescription) => {
      const normalizedStatus = normalizeStatus(prescription.estado);
      const matchesStatus = status === "todas" || normalizedStatus === status;
      const haystack = [
        prescription.id_prescripcion,
        prescription.titulo,
        prescription.medicamento,
        prescription.frecuencia,
        prescription.indicaciones,
        formatPatientName(prescription.pacientes)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [prescriptions, query, status]);

  const selectedPrescription =
    prescriptions.find((prescription) => prescription.id_prescripcion === selectedId) ??
    filteredPrescriptions[0] ??
    prescriptions[0] ??
    null;

  const activeCount = prescriptions.filter((prescription) => normalizeStatus(prescription.estado) === "activa").length;

  return (
    <section className="dashboard-card prescriptions-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Prescripciones</p>
          <h2>Tratamientos cargados</h2>
        </div>
        <div className="prescription-summary">
          <strong>{activeCount}</strong>
          <span>activas</span>
        </div>
      </div>

      <div className="prescription-toolbar">
        <label className="directory-search prescription-search">
          <span>Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Medicamento, paciente o indicación" />
        </label>
        <div className="status-filter" aria-label="Filtrar por estado">
          {STATUS_OPTIONS.map((option) => (
            <button className={status === option.value ? "active" : ""} type="button" onClick={() => setStatus(option.value)} key={option.value}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {prescriptions.length ? (
        <div className="prescriptions-layout">
          <div className="prescription-inbox" aria-label="Lista de prescripciones">
            {filteredPrescriptions.length ? (
              filteredPrescriptions.map((prescription) => {
                const isSelected = prescription.id_prescripcion === selectedPrescription?.id_prescripcion;
                const dose = formatDose(prescription);

                return (
                  <button
                    className={`prescription-row ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedId(prescription.id_prescripcion)}
                    key={prescription.id_prescripcion}
                  >
                    <span className={`status-dot ${normalizeStatus(prescription.estado)}`} aria-hidden="true" />
                    <span>
                      <strong>{prescription.medicamento || prescription.titulo || `Prescripción #${prescription.id_prescripcion}`}</strong>
                      <small>{formatPatientName(prescription.pacientes)}</small>
                    </span>
                    <em>{dose || "Sin dosis"}</em>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">No hay prescripciones que coincidan con los filtros.</p>
            )}
          </div>

          <PrescriptionDetail prescription={selectedPrescription} />
        </div>
      ) : (
        <p className="empty-state">Todavía no hay prescripciones cargadas.</p>
      )}
    </section>
  );
}

function PrescriptionDetail({ prescription }: { prescription: PrescriptionBoardRow | null }) {
  if (!prescription) {
    return (
      <aside className="prescription-detail">
        <p className="empty-state">Seleccioná una prescripción para ver el detalle.</p>
      </aside>
    );
  }

  return (
    <aside className="prescription-detail">
      <div className="prescription-detail-header">
        <span className={`status-pill ${normalizeStatus(prescription.estado)}`}>{formatValue(prescription.estado, "Sin estado")}</span>
        <h3>{prescription.medicamento || prescription.titulo || `Prescripción #${prescription.id_prescripcion}`}</h3>
        <p>{formatPatientName(prescription.pacientes)}</p>
      </div>

      <dl className="prescription-detail-grid">
        <div>
          <dt>Dosis</dt>
          <dd>{formatDose(prescription) || "No cargado"}</dd>
        </div>
        <div>
          <dt>Frecuencia</dt>
          <dd>{formatValue(prescription.frecuencia)}</dd>
        </div>
        <div>
          <dt>Inicio</dt>
          <dd>{formatDate(prescription.fecha_inicio)}</dd>
        </div>
        <div>
          <dt>Fin</dt>
          <dd>{formatDate(prescription.fecha_fin)}</dd>
        </div>
      </dl>

      <div className="prescription-notes">
        <span>Indicaciones</span>
        <p>{formatValue(prescription.indicaciones)}</p>
      </div>
    </aside>
  );
}

function formatDose(prescription: PrescriptionBoardRow) {
  return [prescription.dosis, prescription.unidad].filter(Boolean).join(" ");
}

function normalizeStatus(value: string | null): StatusFilter {
  const cleanValue = (value ?? "").toLowerCase();

  if (cleanValue === "pausada" || cleanValue === "finalizada") {
    return cleanValue;
  }

  return "activa";
}
