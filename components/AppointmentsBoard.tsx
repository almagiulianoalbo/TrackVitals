"use client";

import { useMemo, useState } from "react";
import type { UserRole } from "@/lib/auth-types";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";

export type AppointmentBoardRow = {
  id_turno: number;
  fecha_hora: string | null;
  motivo: string | null;
  estado: string | null;
  vista: "pendientes" | "historial";
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
  medicos?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

export function AppointmentsBoard({ appointments, role }: { appointments: AppointmentBoardRow[]; role: UserRole }) {
  const [view, setView] = useState<"pendientes" | "historial">("pendientes");
  const visibleAppointments = useMemo(() => appointments.filter((appointment) => appointment.vista === view), [appointments, view]);
  const pendingCount = appointments.filter((appointment) => appointment.vista === "pendientes").length;
  const historyCount = appointments.filter((appointment) => appointment.vista === "historial").length;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedAppointment =
    visibleAppointments.find((appointment) => appointment.id_turno === selectedId) ?? visibleAppointments[0] ?? null;
  const nextAppointment = appointments.find((appointment) => appointment.vista === "pendientes") ?? null;

  return (
    <section className="appointments-board">
      <div className="patients-directory-hero">
        <div>
          <p className="eyebrow">Turnos</p>
          <h2>Agenda</h2>
          <p>Consultas pendientes e historial en una vista simple para seguir el calendario clínico.</p>
        </div>
        <div className="appointments-summary" aria-label="Resumen de turnos">
          <span><strong>{pendingCount}</strong> pendientes</span>
          <span><strong>{historyCount}</strong> historial</span>
        </div>
      </div>

      <article className="appointments-hero">
        <span>Próximo turno</span>
        <strong>{nextAppointment ? formatDateTime(nextAppointment.fecha_hora) : "Sin turnos pendientes"}</strong>
        <em>{nextAppointment ? getCounterpart(nextAppointment, role) : "Cuando haya un turno futuro, aparecerá acá."}</em>
      </article>

      <div className="appointments-toolbar">
        <div className="status-filter" aria-label="Vista de turnos">
          <button className={view === "pendientes" ? "active" : ""} type="button" onClick={() => setView("pendientes")}>
            Pendientes
          </button>
          <button className={view === "historial" ? "active" : ""} type="button" onClick={() => setView("historial")}>
            Historial
          </button>
        </div>
      </div>

      <div className="appointments-layout">
        <section className="appointments-list" aria-label={view === "pendientes" ? "Turnos pendientes" : "Historial de turnos"}>
          {visibleAppointments.length ? (
            visibleAppointments.map((appointment) => (
              <button
                className={selectedAppointment?.id_turno === appointment.id_turno ? "appointment-row active" : "appointment-row"}
                key={appointment.id_turno}
                type="button"
                onClick={() => setSelectedId(appointment.id_turno)}
              >
                <span className="appointment-date-badge">
                  <strong>{getDay(appointment.fecha_hora)}</strong>
                  <small>{getMonth(appointment.fecha_hora)}</small>
                </span>
                <span>
                  <strong>{getCounterpart(appointment, role)}</strong>
                  <small>{formatValue(appointment.motivo, "Consulta o control")}</small>
                </span>
                <em>{getTime(appointment.fecha_hora)}</em>
              </button>
            ))
          ) : (
            <p className="empty-state">No hay turnos para mostrar.</p>
          )}
        </section>

        <article className="appointment-detail">
          {selectedAppointment ? (
            <>
              <div className="appointment-detail-header">
                <span className={`appointment-status ${selectedAppointment.vista}`}>
                  {selectedAppointment.vista === "pendientes" ? "Pendiente" : "Historial"}
                </span>
                <h3>{formatDateTime(selectedAppointment.fecha_hora)}</h3>
                <p>{getCounterpart(selectedAppointment, role)}</p>
              </div>
              <dl className="appointment-detail-grid">
                <Info label="Motivo" value={formatValue(selectedAppointment.motivo, "Consulta o control")} />
                <Info label="Estado" value={formatValue(selectedAppointment.estado, "Pendiente")} />
                <Info label={role === "medico" ? "Paciente" : "Profesional"} value={getCounterpart(selectedAppointment, role)} />
                <Info label="Turno" value={`#${selectedAppointment.id_turno}`} />
              </dl>
            </>
          ) : (
            <p className="empty-state">Seleccioná un turno para ver el detalle.</p>
          )}
        </article>
      </div>
    </section>
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

function getCounterpart(appointment: AppointmentBoardRow, role: UserRole) {
  return role === "medico" ? formatPatientName(appointment.pacientes) : `Dr/a. ${formatPatientName(appointment.medicos)}`;
}

function getDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDay(date: string | null) {
  return getDate(date)?.toLocaleDateString("es-AR", { day: "2-digit" }) ?? "--";
}

function getMonth(date: string | null) {
  return getDate(date)?.toLocaleDateString("es-AR", { month: "short" }).replace(".", "") ?? "---";
}

function getTime(date: string | null) {
  return getDate(date)?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
}
