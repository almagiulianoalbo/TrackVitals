"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";

type PersonName = { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
type ViewMode = "pendientes" | "historial";

export type AppointmentBoardRow = {
  id_turno: number;
  fecha_hora: string | null;
  motivo: string | null;
  estado: string | null;
  vista: ViewMode;
  pacientes?: PersonName;
  medicos?: PersonName;
};

export function AppointmentsBoard({ appointments, role }: { appointments: AppointmentBoardRow[]; role: "paciente" | "medico" }) {
  const [view, setView] = useState<ViewMode>("pendientes");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(appointments.find((item) => item.vista === "pendientes")?.id_turno ?? appointments[0]?.id_turno ?? null);

  const filteredAppointments = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const personName = getPersonName(appointment, role);
      const haystack = [appointment.id_turno, appointment.motivo, appointment.estado, personName, formatDateTime(appointment.fecha_hora)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return appointment.vista === view && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [appointments, query, role, view]);

  const selectedAppointment = filteredAppointments.find((appointment) => appointment.id_turno === selectedId) ?? filteredAppointments[0] ?? null;
  const pendingCount = appointments.filter((appointment) => appointment.vista === "pendientes").length;
  const historyCount = appointments.filter((appointment) => appointment.vista === "historial").length;
  const nextAppointment = appointments.find((appointment) => appointment.vista === "pendientes") ?? null;

  useEffect(() => {
    if (!filteredAppointments.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredAppointments.some((appointment) => appointment.id_turno === selectedId)) {
      setSelectedId(filteredAppointments[0].id_turno);
    }
  }, [filteredAppointments, selectedId]);

  return (
    <section className="dashboard-card appointments-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Turnos</p>
          <h2>{role === "medico" ? "Agenda" : "Mis turnos"}</h2>
        </div>
        <div className="appointments-summary">
          <span>
            <strong>{pendingCount}</strong> pendientes
          </span>
          <span>
            <strong>{historyCount}</strong> historial
          </span>
        </div>
      </div>

      <div className="appointments-hero">
        <span>Próximo turno</span>
        <strong>{nextAppointment ? formatDateTime(nextAppointment.fecha_hora) : "Sin turnos pendientes"}</strong>
        <em>{nextAppointment ? [getPersonName(nextAppointment, role), nextAppointment.motivo].filter(Boolean).join(" · ") : "La agenda está libre."}</em>
      </div>

      <div className="appointments-toolbar">
        <label className="directory-search">
          <span>Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={role === "medico" ? "Paciente, motivo o fecha" : "Médico, motivo o fecha"} />
        </label>
        <div className="status-filter" aria-label="Vista de turnos">
          <button className={view === "pendientes" ? "active" : ""} type="button" onClick={() => setView("pendientes")}>
            Pendientes
          </button>
          <button className={view === "historial" ? "active" : ""} type="button" onClick={() => setView("historial")}>
            Historial
          </button>
        </div>
      </div>

      {appointments.length ? (
        <div className="appointments-layout">
          <div className="appointments-list" aria-label="Lista de turnos">
            {filteredAppointments.length ? (
              filteredAppointments.map((appointment) => {
                const isSelected = appointment.id_turno === selectedAppointment?.id_turno;

                return (
                  <button className={`appointment-row ${isSelected ? "active" : ""}`} type="button" onClick={() => setSelectedId(appointment.id_turno)} key={appointment.id_turno}>
                    <span className="appointment-date-badge">
                      <strong>{formatDay(appointment.fecha_hora)}</strong>
                      <small>{formatMonth(appointment.fecha_hora)}</small>
                    </span>
                    <span>
                      <strong>{getPersonName(appointment, role)}</strong>
                      <small>{formatDateTime(appointment.fecha_hora)}</small>
                    </span>
                    <em>{formatValue(appointment.motivo, "Sin motivo")}</em>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">{view === "historial" ? "No hay turnos pasados con esos filtros." : "No hay turnos pendientes con esos filtros."}</p>
            )}
          </div>

          <AppointmentDetail appointment={selectedAppointment} role={role} />
        </div>
      ) : (
        <p className="empty-state">Todavía no hay turnos cargados.</p>
      )}
    </section>
  );
}

function AppointmentDetail({ appointment, role }: { appointment: AppointmentBoardRow | null; role: "paciente" | "medico" }) {
  if (!appointment) {
    return (
      <aside className="appointment-detail">
        <p className="empty-state">Seleccioná un turno para ver el detalle.</p>
      </aside>
    );
  }

  return (
    <aside className="appointment-detail">
      <div className="appointment-detail-header">
        <span className={`appointment-status ${appointment.vista}`}>{appointment.vista === "pendientes" ? "Pendiente" : "Historial"}</span>
        <h3>{getPersonName(appointment, role)}</h3>
        <p>{formatDateTime(appointment.fecha_hora)}</p>
      </div>

      <dl className="appointment-detail-grid">
        <div>
          <dt>Motivo</dt>
          <dd>{formatValue(appointment.motivo, "Sin motivo")}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{formatValue(appointment.estado, "Sin estado")}</dd>
        </div>
        <div>
          <dt>{role === "medico" ? "Paciente" : "Médico"}</dt>
          <dd>{getPersonName(appointment, role)}</dd>
        </div>
        <div>
          <dt>ID turno</dt>
          <dd>#{appointment.id_turno}</dd>
        </div>
      </dl>
    </aside>
  );
}

function getPersonName(appointment: AppointmentBoardRow, role: "paciente" | "medico") {
  return role === "medico" ? formatPatientName(appointment.pacientes) : `Dr/a. ${formatPatientName(appointment.medicos)}`;
}

function formatDay(value: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-AR", { day: "2-digit" });
}

function formatMonth(value: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
}
