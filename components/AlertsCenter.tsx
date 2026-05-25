"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";

type PatientName = { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
type ViewFilter = "todas" | "pendientes" | "vistas";

export type AlertCenterRow = {
  id_alerta: number;
  tipo: string | null;
  valor_disparador: number | string | null;
  fecha: string | null;
  vista: boolean | null;
  pacientes?: PatientName;
};

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendientes", label: "Pendientes" },
  { value: "vistas", label: "Vistas" }
];

export function AlertsCenter({ alerts }: { alerts: AlertCenterRow[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewFilter>("todas");
  const [type, setType] = useState("todos");
  const [selectedId, setSelectedId] = useState<number | null>(alerts[0]?.id_alerta ?? null);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    alerts.forEach((alert) => {
      if (alert.tipo) types.add(alert.tipo);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b, "es"));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesView = view === "todas" || (view === "pendientes" ? !alert.vista : Boolean(alert.vista));
      const matchesType = type === "todos" || alert.tipo === type;
      const haystack = [alert.id_alerta, alert.tipo, alert.valor_disparador, formatPatientName(alert.pacientes), formatDateTime(alert.fecha)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesView && matchesType && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [alerts, query, type, view]);

  const selectedAlert = filteredAlerts.find((alert) => alert.id_alerta === selectedId) ?? filteredAlerts[0] ?? null;
  const pendingCount = alerts.filter((alert) => !alert.vista).length;
  const highCount = alerts.filter((alert) => getAlertTone(alert) === "high").length;

  useEffect(() => {
    if (!filteredAlerts.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredAlerts.some((alert) => alert.id_alerta === selectedId)) {
      setSelectedId(filteredAlerts[0].id_alerta);
    }
  }, [filteredAlerts, selectedId]);

  return (
    <section className="dashboard-card alerts-center">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Alertas</p>
          <h2>Centro de alertas</h2>
        </div>
        <div className="alerts-summary">
          <span>
            <strong>{pendingCount}</strong> pendientes
          </span>
          <span>
            <strong>{highCount}</strong> críticas
          </span>
        </div>
      </div>

      <div className="alerts-toolbar">
        <label className="directory-search">
          <span>Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paciente, tipo, valor o fecha" />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="todos">Todos los tipos</option>
            {typeOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="status-filter" aria-label="Vista de alertas">
          {VIEW_OPTIONS.map((option) => (
            <button className={view === option.value ? "active" : ""} type="button" onClick={() => setView(option.value)} key={option.value}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {alerts.length ? (
        <div className="alerts-layout">
          <div className="alerts-stack" aria-label="Lista de alertas">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => {
                const isSelected = alert.id_alerta === selectedAlert?.id_alerta;
                const tone = getAlertTone(alert);

                return (
                  <button className={`alert-row ${isSelected ? "active" : ""} ${tone}`} type="button" onClick={() => setSelectedId(alert.id_alerta)} key={alert.id_alerta}>
                    <span className={`alert-severity ${tone}`}>{formatAlertValue(alert.valor_disparador)}</span>
                    <span>
                      <strong>{formatValue(alert.tipo, "Alerta")}</strong>
                      <small>{formatPatientName(alert.pacientes)}</small>
                    </span>
                    <em>{alert.vista ? "Vista" : "Pendiente"}</em>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">No hay alertas que coincidan con los filtros.</p>
            )}
          </div>

          <AlertDetail alert={selectedAlert} filteredAlerts={filteredAlerts} />
        </div>
      ) : (
        <p className="empty-state">Todavía no hay alertas cargadas.</p>
      )}
    </section>
  );
}

function AlertDetail({ alert, filteredAlerts }: { alert: AlertCenterRow | null; filteredAlerts: AlertCenterRow[] }) {
  if (!alert) {
    return (
      <aside className="alert-detail">
        <p className="empty-state">Seleccioná una alerta para ver su detalle.</p>
      </aside>
    );
  }

  const tone = getAlertTone(alert);
  const samePatientCount = filteredAlerts.filter((item) => formatPatientName(item.pacientes) === formatPatientName(alert.pacientes)).length;

  return (
    <aside className={`alert-detail ${tone}`}>
      <div className="alert-detail-header">
        <span className={`alert-status-pill ${alert.vista ? "seen" : "pending"}`}>{alert.vista ? "Vista" : "Pendiente"}</span>
        <h3>{formatValue(alert.tipo, "Alerta")}</h3>
        <p>{formatPatientName(alert.pacientes)}</p>
      </div>

      <div className="alert-value-panel">
        <span>Valor disparador</span>
        <strong>{formatAlertValue(alert.valor_disparador)}</strong>
      </div>

      <dl className="alert-detail-grid">
        <div>
          <dt>Fecha</dt>
          <dd>{formatDateTime(alert.fecha)}</dd>
        </div>
        <div>
          <dt>Alertas del paciente</dt>
          <dd>{samePatientCount}</dd>
        </div>
        <div>
          <dt>Severidad</dt>
          <dd>{tone === "high" ? "Alta" : tone === "medium" ? "Media" : "Baja"}</dd>
        </div>
        <div>
          <dt>ID alerta</dt>
          <dd>#{alert.id_alerta}</dd>
        </div>
      </dl>
    </aside>
  );
}

function getAlertTone(alert: AlertCenterRow) {
  const value = Number(alert.valor_disparador);
  const type = (alert.tipo ?? "").toLowerCase();

  if (type.includes("hiper") || value >= 180) return "high";
  if (type.includes("hipo") || value < 70) return "medium";
  return "low";
}

function formatAlertValue(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}
