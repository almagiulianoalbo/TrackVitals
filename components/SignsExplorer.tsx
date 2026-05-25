"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";

type PatientName = { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
type RangeFilter = "todos" | "7d" | "30d" | "90d";

export type SignExplorerRow = {
  id_registro: number;
  fecha_hora: string;
  momento: string | null;
  glucemia_mgdl: number | null;
  carbohidratos_g: number | null;
  tipo_insulina: string | null;
  dosis_unidades: number | string | null;
  pacientes?: PatientName;
};

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" }
];

export function SignsExplorer({ signs }: { signs: SignExplorerRow[] }) {
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState("todos");
  const [range, setRange] = useState<RangeFilter>("todos");
  const [selectedId, setSelectedId] = useState<number | null>(signs[0]?.id_registro ?? null);

  const patientOptions = useMemo(() => {
    const names = new Map<string, string>();

    signs.forEach((sign) => {
      const name = formatPatientName(sign.pacientes);
      names.set(name, name);
    });

    return Array.from(names.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [signs]);

  const filteredSigns = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const anchor = getLatestDate(signs);
    const since = getSinceDate(anchor, range);

    return signs.filter((sign) => {
      const patientName = formatPatientName(sign.pacientes);
      const matchesPatient = patient === "todos" || patientName === patient;
      const date = new Date(sign.fecha_hora);
      const matchesRange = !since || (!Number.isNaN(date.getTime()) && date >= since && date <= anchor);
      const haystack = [
        sign.id_registro,
        patientName,
        sign.momento,
        sign.glucemia_mgdl,
        sign.carbohidratos_g,
        sign.tipo_insulina,
        sign.dosis_unidades
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesPatient && matchesRange && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [signs, patient, query, range]);

  const selectedSign =
    filteredSigns.find((sign) => sign.id_registro === selectedId) ?? filteredSigns[0] ?? null;
  const glucoseValues = filteredSigns.map((sign) => Number(sign.glucemia_mgdl)).filter(Number.isFinite);
  const averageGlucose = glucoseValues.length
    ? Math.round(glucoseValues.reduce((sum, value) => sum + value, 0) / glucoseValues.length)
    : null;
  const highCount = glucoseValues.filter((value) => value > 180).length;

  useEffect(() => {
    if (!filteredSigns.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredSigns.some((sign) => sign.id_registro === selectedId)) {
      setSelectedId(filteredSigns[0].id_registro);
    }
  }, [filteredSigns, selectedId]);

  return (
    <section className="dashboard-card signs-explorer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Registrar signos</p>
          <h2>Registros clínicos</h2>
        </div>
        <div className="signs-summary">
          <strong>{filteredSigns.length}</strong>
          <span>registros</span>
        </div>
      </div>

      <div className="signs-toolbar">
        <label className="directory-search">
          <span>Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paciente, momento, insulina o valor" />
        </label>
        <label className="field">
          <span>Paciente</span>
          <select value={patient} onChange={(event) => setPatient(event.target.value)}>
            <option value="todos">Todos los pacientes</option>
            {patientOptions.map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="status-filter" aria-label="Rango de registros">
          {RANGE_OPTIONS.map((option) => (
            <button className={range === option.value ? "active" : ""} type="button" onClick={() => setRange(option.value)} key={option.value}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {signs.length ? (
        <div className="signs-layout">
          <div className="signs-timeline" aria-label="Registros diarios">
            {filteredSigns.length ? (
              filteredSigns.map((sign) => {
                const isSelected = sign.id_registro === selectedSign?.id_registro;

                return (
                  <button className={`sign-row ${isSelected ? "active" : ""}`} type="button" onClick={() => setSelectedId(sign.id_registro)} key={sign.id_registro}>
                    <span className={`glucose-badge ${getGlucoseTone(sign.glucemia_mgdl)}`}>{sign.glucemia_mgdl ?? "--"}</span>
                    <span>
                      <strong>{formatPatientName(sign.pacientes)}</strong>
                      <small>{formatDateTime(sign.fecha_hora)}</small>
                    </span>
                    <em>{formatValue(sign.momento, "Sin momento")}</em>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">No hay registros que coincidan con los filtros.</p>
            )}
          </div>

          <aside className="sign-detail">
            <div className="sign-kpis">
              <MetricMini label="Promedio" value={averageGlucose ? `${averageGlucose}` : "--"} unit={averageGlucose ? "mg/dL" : ""} />
              <MetricMini label="Altas" value={String(highCount)} unit=">180" />
              <MetricMini label="Registros" value={String(filteredSigns.length)} unit={rangeLabel(range)} />
            </div>

            <SignTrend signs={filteredSigns} />
            <SignDetail sign={selectedSign} />
          </aside>
        </div>
      ) : (
        <p className="empty-state">Todavía no hay registros diarios para tus pacientes.</p>
      )}
    </section>
  );
}

function SignDetail({ sign }: { sign: SignExplorerRow | null }) {
  if (!sign) {
    return <p className="empty-state">Seleccioná un registro para ver el detalle.</p>;
  }

  return (
    <div className="selected-sign-card">
      <div>
        <p className="eyebrow">Registro seleccionado</p>
        <h3>{formatPatientName(sign.pacientes)}</h3>
        <span>{formatDateTime(sign.fecha_hora)}</span>
      </div>

      <dl className="sign-detail-grid">
        <div>
          <dt>Momento</dt>
          <dd>{formatValue(sign.momento)}</dd>
        </div>
        <div>
          <dt>Glucemia</dt>
          <dd>{sign.glucemia_mgdl ? `${sign.glucemia_mgdl} mg/dL` : "No cargado"}</dd>
        </div>
        <div>
          <dt>Carbohidratos</dt>
          <dd>{sign.carbohidratos_g ? `${sign.carbohidratos_g} g` : "No cargado"}</dd>
        </div>
        <div>
          <dt>Insulina</dt>
          <dd>{formatValue(sign.tipo_insulina)}</dd>
        </div>
        <div>
          <dt>Dosis</dt>
          <dd>{sign.dosis_unidades ? `${sign.dosis_unidades} unidades` : "No cargado"}</dd>
        </div>
      </dl>
    </div>
  );
}

function SignTrend({ signs }: { signs: SignExplorerRow[] }) {
  const values = signs
    .slice()
    .reverse()
    .map((sign) => Number(sign.glucemia_mgdl))
    .filter(Number.isFinite)
    .slice(-18);
  const max = Math.max(...values, 220);
  const min = Math.min(...values, 60);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = 18 + (index / Math.max(values.length - 1, 1)) * 284;
    const y = 120 - ((value - min) / range) * 92;
    return { x, y, value };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

  return (
    <div className="sign-trend">
      <div className="chart-heading-row">
        <h3>Tendencia de glucemia</h3>
        <span>{values.length} puntos</span>
      </div>
      {points.length ? (
        <svg viewBox="0 0 320 140" role="img" aria-label="Tendencia de glucemia">
          <path className="chart-grid-line" d="M18 30H302M18 70H302M18 110H302" />
          {points.length > 1 ? <path className="chart-line smooth-line" d={path} /> : null}
          <g className="chart-dots">
            {points.map((point, index) => (
              <circle cx={point.x} cy={point.y} r="4" key={`${point.value}-${index}`} />
            ))}
          </g>
        </svg>
      ) : (
        <p className="chart-empty">Sin datos de glucemia para graficar.</p>
      )}
    </div>
  );
}

function MetricMini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="sign-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {unit ? <em>{unit}</em> : null}
    </div>
  );
}

function getLatestDate(signs: SignExplorerRow[]) {
  const latest = signs
    .map((sign) => new Date(sign.fecha_hora))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ?? new Date();
}

function getSinceDate(anchor: Date, range: RangeFilter) {
  const daysByRange: Record<RangeFilter, number | null> = {
    todos: null,
    "7d": 7,
    "30d": 30,
    "90d": 90
  };
  const days = daysByRange[range];

  if (!days) return null;

  return new Date(anchor.getTime() - days * 24 * 60 * 60 * 1000);
}

function getGlucoseTone(value: number | null) {
  if (!value) return "unknown";
  if (value < 70) return "low";
  if (value > 180) return "high";
  return "normal";
}

function rangeLabel(range: RangeFilter) {
  const labels: Record<RangeFilter, string> = {
    todos: "total",
    "7d": "7 días",
    "30d": "30 días",
    "90d": "90 días"
  };

  return labels[range];
}
