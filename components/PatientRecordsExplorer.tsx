"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatValue } from "@/lib/dashboard-format";

export type PatientRecordRow = {
  id_registro: number;
  id_paciente: number | null;
  fecha_hora: string;
  momento: string | null;
  glucemia_mgdl: number | null;
  carbohidratos_g: number | null;
  tipo_insulina: string | null;
  dosis_unidades: number | string | null;
};

type CalendarCell = {
  date: Date;
  key: string;
  muted: boolean;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function PatientRecordsExplorer({ records }: { records: PatientRecordRow[] }) {
  const initialDate = getDateKey(records[0]?.fecha_hora ?? new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialDate));
  const recordsByDate = useMemo(() => groupByDate(records), [records]);
  const selectedRecords = recordsByDate.get(selectedDate) ?? [];
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(selectedRecords[0]?.id_registro ?? null);
  const selectedRecord = selectedRecords.find((record) => record.id_registro === selectedRecordId) ?? selectedRecords[0] ?? null;
  const monthCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const monthRecords = useMemo(() => getMonthRecords(records, visibleMonth), [records, visibleMonth]);
  const monthAverage = getAverage(monthRecords);
  const monthHighs = monthRecords.filter((record) => Number(record.glucemia_mgdl) > 180).length;

  useEffect(() => {
    setSelectedRecordId(selectedRecords[0]?.id_registro ?? null);
  }, [selectedDate, selectedRecords]);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="patient-calendar-page">
      <div className="patient-calendar-toolbar">
        <div>
          <p className="eyebrow">Mis registros</p>
          <h2>Calendario de controles</h2>
        </div>
        <div className="calendar-month-controls" aria-label="Cambiar mes">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <strong>{formatMonth(visibleMonth)}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>

      <div className="calendar-insights calendar-page-insights">
        <span>{records.length} registros totales</span>
        <span>{monthAverage ? `${monthAverage} mg/dL promedio` : "Sin promedio mensual"}</span>
        <span>{monthHighs} altas este mes</span>
      </div>

      <div className="patient-calendar-layout">
        <article className="records-calendar">
          <div className="calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const dayRecords = recordsByDate.get(cell.key) ?? [];
              const average = getAverage(dayRecords);
              const tone = getDayTone(dayRecords);
              const isActive = cell.key === selectedDate;

              return (
                <button
                  className={`calendar-day ${cell.muted ? "muted" : ""} ${tone} ${isActive ? "active" : ""}`}
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.key);
                    if (cell.muted) setVisibleMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                  }}
                >
                  <span>{cell.date.getDate()}</span>
                  {dayRecords.length ? <i aria-label={`${dayRecords.length} registros`} /> : null}
                  {average ? <strong>{average}</strong> : null}
                  {dayRecords.length ? <em>{dayRecords.length} reg.</em> : null}
                </button>
              );
            })}
          </div>
        </article>

        <aside className="calendar-day-panel">
          <div className="calendar-selected-day">
            <div className="calendar-day-heading">
              <div>
                <p className="eyebrow">Día seleccionado</p>
                <h3>{formatFullDate(selectedDate)}</h3>
                <span>{selectedRecords.length} registros cargados</span>
              </div>
              <div className="calendar-insights">
                <span>{getAverage(selectedRecords) ? `${getAverage(selectedRecords)} mg/dL` : "Sin promedio"}</span>
                <span>{selectedRecords.filter((record) => Number(record.glucemia_mgdl) > 180).length} altas</span>
              </div>
            </div>

            <div className="calendar-day-records">
              {selectedRecords.length ? (
                selectedRecords.map((record) => (
                  <button
                    className={`calendar-record-chip ${record.id_registro === selectedRecord?.id_registro ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedRecordId(record.id_registro)}
                    key={record.id_registro}
                  >
                    <span className={`glucose-badge ${getGlucoseTone(record.glucemia_mgdl)}`}>{record.glucemia_mgdl ?? "--"}</span>
                    <span>
                      <strong>{formatValue(record.momento, "Registro")}</strong>
                      <small>{formatTime(record.fecha_hora)}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="calendar-record-empty">No hay registros este día.</p>
              )}
            </div>

            <RecordDetail record={selectedRecord} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function RecordDetail({ record }: { record: PatientRecordRow | null }) {
  if (!record) {
    return <p className="calendar-record-empty">Elegí un día con registros para ver el detalle.</p>;
  }

  return (
    <article className="patient-record-detail">
      <div className="patient-record-detail-heading">
        <span className={`glucose-badge ${getGlucoseTone(record.glucemia_mgdl)}`}>{record.glucemia_mgdl ?? "--"}</span>
        <div>
          <p className="eyebrow">Registro seleccionado</p>
          <h3>{formatValue(record.momento, "Registro")}</h3>
          <span>{formatDateTime(record.fecha_hora)}</span>
        </div>
      </div>

      <dl className="record-detail-lines">
        <Info label="Glucemia" value={record.glucemia_mgdl ? `${record.glucemia_mgdl} mg/dL` : "No cargado"} />
        <Info label="Carbohidratos" value={record.carbohidratos_g ? `${record.carbohidratos_g} g` : "No cargado"} />
        <Info label="Insulina" value={record.tipo_insulina} />
        <Info label="Dosis" value={record.dosis_unidades ? `${record.dosis_unidades} unidades` : "No cargado"} />
      </dl>

      <Link className="inline-action" href={`/dashboard/mis-registros/view?id=${record.id_registro}`}>
        Ver todo
      </Link>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatValue(value)}</dd>
    </div>
  );
}

function groupByDate(records: PatientRecordRow[]) {
  const groups = new Map<string, PatientRecordRow[]>();
  records.forEach((record) => {
    const key = getDateKey(record.fecha_hora);
    groups.set(key, [...(groups.get(key) ?? []), record].toSorted((left, right) => new Date(left.fecha_hora).getTime() - new Date(right.fecha_hora).getTime()));
  });
  return groups;
}

function buildCalendarCells(visibleMonth: Date): CalendarCell[] {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: getDateKey(date),
      muted: date.getMonth() !== visibleMonth.getMonth()
    };
  });
}

function getMonthRecords(records: PatientRecordRow[], visibleMonth: Date) {
  return records.filter((record) => {
    const date = new Date(record.fecha_hora);
    return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth();
  });
}

function getAverage(records: PatientRecordRow[]) {
  const values = records.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getDayTone(records: PatientRecordRow[]) {
  const average = getAverage(records);
  if (!average) return "";
  if (average < 70) return "low";
  if (average > 180) return "high";
  return "normal";
}

function getGlucoseTone(value: number | null) {
  if (typeof value !== "number") return "";
  if (value < 70) return "low";
  if (value > 180) return "high";
  return "normal";
}

function getDateKey(value: string | Date) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  return value.slice(0, 10);
}

function startOfMonth(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function formatFullDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
