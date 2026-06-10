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
    const patientSigns = signs.filter((sign) => {
      const patientName = formatPatientName(sign.pacientes);
      return patient === "todos" || patientName === patient;
    });
    const anchor = getLatestDate(patientSigns);
    const since = getSinceDate(anchor, range);

    return patientSigns.filter((sign) => {
      const patientName = formatPatientName(sign.pacientes);
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

      return matchesRange && (!cleanQuery || haystack.includes(cleanQuery));
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
          <p className="eyebrow">Registros clínicos</p>
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

            <SignTrend signs={filteredSigns} range={range} />
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

function SignTrend({ signs, range }: { signs: SignExplorerRow[]; range: RangeFilter }) {
  const readings = signs
    .map((sign) => {
      const value = Number(sign.glucemia_mgdl);
      const date = new Date(sign.fecha_hora);
      return Number.isFinite(value) && !Number.isNaN(date.getTime()) ? { value, date } : null;
    })
    .filter((reading): reading is { value: number; date: Date } => Boolean(reading))
    .toSorted((left, right) => left.date.getTime() - right.date.getTime());
  const trendReadings = buildTrendReadings(readings, range);
  const values = trendReadings.map((reading) => reading.value);
  const rawMin = Math.min(...values, 70);
  const rawMax = Math.max(...values, 180);
  const yMin = Math.max(40, Math.floor((rawMin - 14) / 10) * 10);
  const yMax = Math.ceil((rawMax + 14) / 10) * 10;
  const width = 420;
  const height = 220;
  const padding = { left: 42, right: 18, top: 22, bottom: 34 };
  const firstTime = trendReadings[0]?.date.getTime() ?? 0;
  const lastTime = trendReadings.at(-1)?.date.getTime() ?? firstTime;
  const timeRange = Math.max(lastTime - firstTime, 1);
  const yForValue = (value: number) =>
    padding.top + ((yMax - value) * (height - padding.top - padding.bottom)) / (yMax - yMin || 1);
  const points = trendReadings.map((reading) => {
    const x = trendReadings.length === 1
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
  const areaPath = buildTrendAreaPath(points, height - padding.bottom);
  const highLineY = yForValue(180);
  const lowLineY = yForValue(70);
  const rangeTop = Math.min(highLineY, lowLineY);
  const rangeHeight = Math.abs(lowLineY - highLineY);
  const firstLabel = trendReadings[0] ? formatShortDate(trendReadings[0].date.toISOString()) : "";
  const lastLabel = trendReadings.at(-1) ? formatShortDate(trendReadings.at(-1)!.date.toISOString()) : "";
  const pointLabel = getTrendPointLabel(range, trendReadings.length);

  return (
    <div className="sign-trend">
      <div className="chart-heading-row">
        <h3>Tendencia de glucemia</h3>
        <span>{readings.length ? pointLabel : "Sin datos"}</span>
      </div>
      {points.length ? (
        <div className="sign-trend-chart">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de glucemia">
            <defs>
              <linearGradient id="signTrendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1575ba" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#1575ba" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect className="sign-trend-target" x={padding.left} y={rangeTop} width={width - padding.left - padding.right} height={rangeHeight} rx="10" />
            <path className="chart-grid-line" d={`M${padding.left} ${padding.top}H${width - padding.right}M${padding.left} ${highLineY}H${width - padding.right}M${padding.left} ${lowLineY}H${width - padding.right}M${padding.left} ${height - padding.bottom}H${width - padding.right}`} />
            {areaPath ? <path className="sign-trend-area" d={areaPath} /> : null}
            {linePath ? <path className="sign-trend-line smooth-line" d={linePath} /> : null}
            <g className="sign-trend-labels">
              <text x="8" y={padding.top + 4}>{yMax}</text>
              <text x="8" y={highLineY + 4}>180</text>
              <text x="8" y={lowLineY + 4}>70</text>
              <text x="8" y={height - padding.bottom + 4}>{yMin}</text>
            </g>
            <g className="chart-dots">
            {points.map((point, index) => (
              <circle className={`chart-dot-${point.tone}`} cx={point.x} cy={point.y} r="5" key={`${point.value}-${point.date.toISOString()}-${index}`}>
                <title>{`${formatDateTime(point.date.toISOString())}: ${point.value} mg/dL`}</title>
              </circle>
            ))}
            </g>
          </svg>
          <div className="sign-trend-footer" aria-hidden="true">
            <span>{firstLabel}</span>
            <span>Rango objetivo 70-180 mg/dL</span>
            <span>{lastLabel}</span>
          </div>
        </div>
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

type TrendReading = {
  date: Date;
  value: number;
};

function buildTrendReadings(readings: TrendReading[], range: RangeFilter) {
  if (range === "7d") return readings;
  if (range === "todos") return aggregateByMonth(readings);
  return aggregateByDay(readings);
}

function aggregateByDay(readings: TrendReading[]) {
  const groups = groupReadings(readings, (reading) => getLocalDateKey(reading.date));

  return Array.from(groups.entries()).map(([key, values]) => {
    const [year, month, day] = key.split("-").map(Number);
    return {
      date: new Date(year, month - 1, day, 12),
      value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    };
  });
}

function aggregateByMonth(readings: TrendReading[]) {
  const groups = groupReadings(readings, (reading) => getLocalMonthKey(reading.date));

  return Array.from(groups.entries()).map(([key, values]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      date: new Date(year, month - 1, 15, 12),
      value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    };
  });
}

function groupReadings(readings: TrendReading[], getKey: (reading: TrendReading) => string) {
  return readings.reduce((groups, reading) => {
    const key = getKey(reading);
    const values = groups.get(key) ?? [];
    values.push(reading.value);
    groups.set(key, values);
    return groups;
  }, new Map<string, number[]>());
}

function getTrendPointLabel(range: RangeFilter, pointCount: number) {
  if (range === "7d") return `${pointCount} lecturas`;
  if (range === "todos") return `${pointCount} ${pointCount === 1 ? "promedio mensual" : "promedios mensuales"}`;
  return `${pointCount} ${pointCount === 1 ? "promedio diario" : "promedios diarios"}`;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function buildTrendAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (points.length < 2) return "";
  const line = buildSmoothPath(points);
  const first = points[0];
  const last = points.at(-1)!;
  return `${line} L${last.x.toFixed(1)} ${baseline.toFixed(1)} L${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
