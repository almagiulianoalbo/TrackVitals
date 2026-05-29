"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, formatDateTime, formatValue } from "@/lib/dashboard-format";

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

export function PatientRecordsExplorer({ records }: { records: PatientRecordRow[] }) {
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(records[0]?.fecha_hora ?? new Date().toISOString()));
  const recordsByDate = useMemo(() => groupByDate(records), [records]);
  const selectedRecords = recordsByDate.get(selectedDate) ?? [];
  const selectedRecord = selectedRecords[0] ?? null;
  const monthDays = useMemo(() => buildMonthDays(selectedDate), [selectedDate]);

  return (
    <section className="patient-calendar-shell">
      <div className="patient-calendar-toolbar">
        <div>
          <p className="eyebrow">Mis registros</p>
          <h2>Calendario de controles</h2>
        </div>
        <span className="calendar-count-pill">{records.length} registros</span>
      </div>

      <div className="patient-calendar-layout">
        <article className="dashboard-card">
          <div className="patient-calendar-grid">
            {monthDays.map((day) => {
              const key = getDateKey(day.toISOString());
              const dayRecords = recordsByDate.get(key) ?? [];
              return (
                <button className={key === selectedDate ? "active" : ""} key={key} type="button" onClick={() => setSelectedDate(key)}>
                  <span>{day.getDate()}</span>
                  {dayRecords.length ? <i aria-label={`${dayRecords.length} registros`} /> : null}
                </button>
              );
            })}
          </div>
        </article>

        <aside className="calendar-day-panel">
          <div className="calendar-selected-day">
            <p className="eyebrow">Día seleccionado</p>
            <h2>{formatDate(selectedDate)}</h2>
            <span>{selectedRecords.length} registros cargados</span>
          </div>
          <div className="record-list">
            {selectedRecords.length ? (
              selectedRecords.map((record) => (
                <button className="record-list-item" key={record.id_registro} type="button">
                  <span>{formatValue(record.momento, "Registro")}</span>
                  <strong>{record.glucemia_mgdl ?? "--"} mg/dL</strong>
                </button>
              ))
            ) : (
              <p className="empty-state">No hay registros este día.</p>
            )}
          </div>
        </aside>
      </div>

      <article className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Registro seleccionado</p>
            <h2>{selectedRecord ? formatValue(selectedRecord.momento, "Registro") : "Sin registro"}</h2>
            {selectedRecord ? <p>{formatDateTime(selectedRecord.fecha_hora)}</p> : null}
          </div>
          {selectedRecord ? <Link className="inline-action" href={`/dashboard/mis-registros/view?id=${selectedRecord.id_registro}`}>Ver todo</Link> : null}
        </div>
        {selectedRecord ? (
          <dl className="profile-info-grid">
            <Info label="Glucemia" value={selectedRecord.glucemia_mgdl ? `${selectedRecord.glucemia_mgdl} mg/dL` : "No cargado"} />
            <Info label="Carbohidratos" value={selectedRecord.carbohidratos_g ? `${selectedRecord.carbohidratos_g} g` : "No cargado"} />
            <Info label="Insulina" value={selectedRecord.tipo_insulina} />
            <Info label="Dosis" value={selectedRecord.dosis_unidades ? `${selectedRecord.dosis_unidades} unidades` : "No cargado"} />
          </dl>
        ) : null}
      </article>
    </section>
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
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });
  return groups;
}

function getDateKey(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildMonthDays(selectedDate: string) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return Array.from({ length: end.getDate() }, (_, index) => new Date(start.getFullYear(), start.getMonth(), index + 1));
}
