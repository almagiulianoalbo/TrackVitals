"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

export type MedicationRow = {
  id_medicamento: number;
  nombre: string | null;
  dosis: number | string | null;
  unidad: string | null;
  frecuencia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
};

type FilterKey = "todas" | "activa" | "pausada" | "finalizada";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "activa", label: "Activas" },
  { key: "pausada", label: "Pausadas" },
  { key: "finalizada", label: "Finalizadas" }
];

export function MedicationStudio({ medications }: { medications: MedicationRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("todas");
  const filtered = useMemo(
    () => medications.filter((medication) => filter === "todas" || normalizeStatus(medication.estado) === filter),
    [filter, medications]
  );
  const [selectedId, setSelectedId] = useState<number | null>(medications[0]?.id_medicamento ?? null);
  const selected = filtered.find((medication) => medication.id_medicamento === selectedId) ?? filtered[0] ?? medications[0] ?? null;
  const stats = useMemo(() => buildStats(medications), [medications]);

  return (
    <section className="medication-studio">
      <div className="medication-hero">
        <div>
          <p className="eyebrow">Medicación</p>
          <h2>Rutina de tratamiento</h2>
          <p>Una vista rápida de tus indicaciones, dosis y estado actual.</p>
        </div>
        <div className="medication-stats" aria-label="Resumen de medicación">
          <span><strong>{stats.total}</strong> cargadas</span>
          <span><strong>{stats.active}</strong> activas</span>
          <span><strong>{stats.withEnd}</strong> con fin</span>
        </div>
      </div>

      <div className="medication-filters" aria-label="Filtrar medicación">
        {FILTERS.map((item) => (
          <button className={filter === item.key ? "active" : ""} type="button" onClick={() => setFilter(item.key)} key={item.key}>
            {item.label}
          </button>
        ))}
      </div>

      {medications.length ? (
        <div className="medication-layout">
          <div className="medication-routine" aria-label="Medicamentos">
            {filtered.length ? (
              filtered.map((medication, index) => (
                <button
                  className={`medication-dose-card ${selected?.id_medicamento === medication.id_medicamento ? "active" : ""} ${normalizeStatus(medication.estado)}`}
                  type="button"
                  onClick={() => setSelectedId(medication.id_medicamento)}
                  key={medication.id_medicamento}
                >
                  <span className="medication-pill" aria-hidden="true">{index + 1}</span>
                  <span>
                    <strong>{medication.nombre || `Medicamento #${medication.id_medicamento}`}</strong>
                    <small>{formatDose(medication)}</small>
                  </span>
                  <em>{formatStatus(medication.estado)}</em>
                </button>
              ))
            ) : (
              <p className="empty-state">No hay medicamentos para este filtro.</p>
            )}
          </div>

          <MedicationDetail medication={selected} />
        </div>
      ) : (
        <article className="dashboard-card medication-empty">
          <p className="eyebrow">Sin medicación</p>
          <h2>Todavía no hay indicaciones cargadas</h2>
          <p>Cuando tu médico cargue un tratamiento, vas a verlo organizado acá.</p>
        </article>
      )}
    </section>
  );
}

function MedicationDetail({ medication }: { medication: MedicationRow | null }) {
  if (!medication) {
    return (
      <aside className="medication-detail-panel">
        <p className="empty-state">Elegí un medicamento para ver el detalle.</p>
      </aside>
    );
  }

  const progress = getTreatmentProgress(medication);

  return (
    <aside className="medication-detail-panel">
      <div className="medication-detail-header">
        <span className={`medication-status ${normalizeStatus(medication.estado)}`}>{formatStatus(medication.estado)}</span>
        <h3>{medication.nombre || `Medicamento #${medication.id_medicamento}`}</h3>
        <p>{formatDose(medication)} · {formatValue(medication.frecuencia, "Frecuencia no cargada")}</p>
      </div>

      <div className="treatment-meter" style={{ "--progress": `${progress.percent}%` } as CSSProperties}>
        <strong>{progress.label}</strong>
        <span>{progress.caption}</span>
      </div>

      <dl className="medication-detail-list">
        <Info label="Dosis" value={formatDose(medication)} />
        <Info label="Frecuencia" value={formatValue(medication.frecuencia)} />
        <Info label="Inicio" value={formatDate(medication.fecha_inicio)} />
        <Info label="Fin" value={formatDate(medication.fecha_fin)} />
      </dl>
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildStats(medications: MedicationRow[]) {
  return {
    total: medications.length,
    active: medications.filter((medication) => normalizeStatus(medication.estado) === "activa").length,
    withEnd: medications.filter((medication) => Boolean(medication.fecha_fin)).length
  };
}

function getTreatmentProgress(medication: MedicationRow) {
  if (!medication.fecha_inicio || !medication.fecha_fin) {
    return { percent: normalizeStatus(medication.estado) === "finalizada" ? 100 : 58, label: "Activo", caption: "Sin fecha final" };
  }

  const start = new Date(medication.fecha_inicio).getTime();
  const end = new Date(medication.fecha_fin).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { percent: 50, label: "En curso", caption: "Fechas incompletas" };
  }

  const percent = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  return {
    percent,
    label: `${percent}%`,
    caption: percent >= 100 ? "Tratamiento completo" : "Progreso estimado"
  };
}

function normalizeStatus(status: string | null): FilterKey {
  const value = status?.toLowerCase().trim();
  if (value === "pausada" || value === "finalizada" || value === "activa") return value;
  return "activa";
}

function formatStatus(status: string | null) {
  const normalized = normalizeStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDose(medication: MedicationRow) {
  return [medication.dosis, medication.unidad].filter(Boolean).join(" ") || "Dosis no cargada";
}

function formatValue(value: string | number | null | undefined, fallback = "No cargado") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: string | null) {
  if (!value) return "No cargado";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No cargado";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
