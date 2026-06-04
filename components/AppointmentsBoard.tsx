"use client";

import { useEffect, useMemo, useState } from "react";
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

type CalendarCell = {
  date: Date;
  key: string;
  muted: boolean;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function AppointmentsBoard({ appointments, role }: { appointments: AppointmentBoardRow[]; role: UserRole }) {
  const [view, setView] = useState<"pendientes" | "historial">("pendientes");
  const visibleAppointments = useMemo(() => appointments.filter((appointment) => appointment.vista === view), [appointments, view]);
  const pendingCount = appointments.filter((appointment) => appointment.vista === "pendientes").length;
  const historyCount = appointments.filter((appointment) => appointment.vista === "historial").length;
  const nextAppointment = appointments.find((appointment) => appointment.vista === "pendientes") ?? null;
  const initialDate = getDateKey(nextAppointment?.fecha_hora ?? visibleAppointments[0]?.fecha_hora ?? appointments[0]?.fecha_hora ?? new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialDate));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const appointmentsByDate = useMemo(() => groupAppointmentsByDate(visibleAppointments), [visibleAppointments]);
  const monthCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const selectedDayAppointments = appointmentsByDate.get(selectedDate) ?? [];
  const selectedAppointment = selectedDayAppointments.find((appointment) => appointment.id_turno === selectedId) ?? selectedDayAppointments[0] ?? null;

  useEffect(() => {
    const firstAppointment = visibleAppointments[0] ?? null;

    if (!firstAppointment) {
      setSelectedId(null);
      return;
    }

    const dateKey = getDateKey(firstAppointment.fecha_hora ?? new Date());
    setSelectedDate(dateKey);
    setVisibleMonth(startOfMonth(dateKey));
    setSelectedId(firstAppointment.id_turno);
  }, [visibleAppointments]);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectDate(cell: CalendarCell) {
    const dayAppointments = appointmentsByDate.get(cell.key) ?? [];
    setSelectedDate(cell.key);
    setSelectedId(dayAppointments[0]?.id_turno ?? null);

    if (cell.muted) {
      setVisibleMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
  }

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
        <div className="calendar-month-controls appointment-month-controls" aria-label="Cambiar mes">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <strong>{formatMonth(visibleMonth)}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>

      <div className="appointments-layout">
        <section className="appointments-calendar" aria-label={view === "pendientes" ? "Calendario de turnos pendientes" : "Calendario de historial de turnos"}>
          <div className="calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const dayAppointments = appointmentsByDate.get(cell.key) ?? [];
              const isActive = cell.key === selectedDate;

              return (
                <button
                  className={`calendar-day appointment-calendar-day ${cell.muted ? "muted" : ""} ${dayAppointments.length ? "has-appointments" : ""} ${isActive ? "active" : ""}`}
                  key={cell.key}
                  type="button"
                  onClick={() => selectDate(cell)}
                >
                  <span>{cell.date.getDate()}</span>
                  {dayAppointments.length ? <i aria-label={`${dayAppointments.length} turnos`} /> : null}
                  {dayAppointments.length ? <strong>{dayAppointments.length} turno{dayAppointments.length > 1 ? "s" : ""}</strong> : null}
                  {dayAppointments[0] ? <em>{getCompactTime(dayAppointments[0].fecha_hora)}</em> : null}
                </button>
              );
            })}
          </div>
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
              <div className="appointment-day-list" aria-label="Turnos del día seleccionado">
                {selectedDayAppointments.map((appointment) => (
                  <button
                    className={appointment.id_turno === selectedAppointment.id_turno ? "active" : ""}
                    key={appointment.id_turno}
                    type="button"
                    onClick={() => setSelectedId(appointment.id_turno)}
                  >
                    <strong>{getTime(appointment.fecha_hora)}</strong>
                    <span>{formatValue(appointment.motivo, "Consulta o control")}</span>
                  </button>
                ))}
              </div>
              <dl className="appointment-detail-grid">
                <Info label="Motivo" value={formatValue(selectedAppointment.motivo, "Consulta o control")} />
                <Info label="Estado" value={formatValue(selectedAppointment.estado, "Pendiente")} />
                <Info label={role === "medico" ? "Paciente" : "Profesional"} value={getCounterpart(selectedAppointment, role)} />
                <Info label="Turno" value={`#${selectedAppointment.id_turno}`} />
              </dl>
            </>
          ) : (
            <p className="empty-state">{visibleAppointments.length ? "Seleccioná un día con turnos para ver el detalle." : "No hay turnos para mostrar."}</p>
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

function groupAppointmentsByDate(appointments: AppointmentBoardRow[]) {
  return appointments.reduce((groups, appointment) => {
    const key = getDateKey(appointment.fecha_hora ?? new Date());
    const dayAppointments = groups.get(key) ?? [];
    groups.set(key, [...dayAppointments, appointment].toSorted(compareAppointmentTime));
    return groups;
  }, new Map<string, AppointmentBoardRow[]>());
}

function compareAppointmentTime(left: AppointmentBoardRow, right: AppointmentBoardRow) {
  return (getDate(left.fecha_hora)?.getTime() ?? 0) - (getDate(right.fecha_hora)?.getTime() ?? 0);
}

function buildCalendarCells(month: Date): CalendarCell[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: getDateKey(date),
      muted: date.getMonth() !== month.getMonth()
    };
  });
}

function startOfMonth(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateKey(value: string | Date) {
  const date = typeof value === "string" ? getDate(value) : value;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const day = String(validDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTime(date: string | null) {
  return getDate(date)?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
}

function getCompactTime(date: string | null) {
  return getDate(date)?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "--:--";
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
