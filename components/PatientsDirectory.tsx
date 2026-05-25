"use client";

import { useMemo, useState } from "react";
import { getInitials } from "@/components/DashboardChrome";
import { formatDate, formatValue } from "@/lib/dashboard-format";

export type PatientDirectoryRow = {
  id_paciente: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_diabetes: string | null;
};

export function PatientsDirectory({ patients }: { patients: PatientDirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(patients[0]?.id_paciente ?? null);

  const filteredPatients = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return patients;
    }

    return patients.filter((patient) => {
      const haystack = [patient.id_paciente, patient.nombre, patient.apellido, patient.email, patient.telefono]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(cleanQuery);
    });
  }, [patients, query]);

  const selectedPatient =
    patients.find((patient) => patient.id_paciente === selectedId) ?? filteredPatients[0] ?? patients[0] ?? null;

  function selectPatient(id: number) {
    setSelectedId(id);
  }

  return (
    <section className="dashboard-card profile-card patients-directory">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mis pacientes</p>
          <h2>Pacientes asignados</h2>
        </div>
        <div className="directory-count">{patients.length} pacientes</div>
      </div>

      <label className="directory-search">
        <span>Buscar paciente</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, email, teléfono o ID" />
      </label>

      {patients.length ? (
        <div className="patients-directory-grid">
          <div className="compact-patient-list" aria-label="Lista de pacientes">
            {filteredPatients.length ? (
              filteredPatients.map((patient) => {
                const patientName = getPatientName(patient);
                const isSelected = patient.id_paciente === selectedPatient?.id_paciente;

                return (
                  <button
                    className={`compact-patient-row ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => selectPatient(patient.id_paciente)}
                    key={patient.id_paciente}
                  >
                    <span className="avatar-badge small" aria-hidden="true">
                      {getInitials(patientName)}
                    </span>
                    <span>
                      <strong>{patientName}</strong>
                      <small>{patient.email ?? "Email no cargado"}</small>
                    </span>
                    <em>#{patient.id_paciente}</em>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">No hay pacientes que coincidan con la búsqueda.</p>
            )}
          </div>

          <PatientDetail patient={selectedPatient} />
        </div>
      ) : (
        <p className="empty-state">Todavía no hay pacientes vinculados.</p>
      )}
    </section>
  );
}

function PatientDetail({ patient }: { patient: PatientDirectoryRow | null }) {
  if (!patient) {
    return (
      <aside className="patient-detail-panel">
        <p className="empty-state">Seleccioná un paciente para ver su información.</p>
      </aside>
    );
  }

  const patientName = getPatientName(patient);

  return (
    <aside className="patient-detail-panel">
      <div className="patient-detail-header">
        <span className="avatar-badge" aria-hidden="true">
          {getInitials(patientName)}
        </span>
        <div>
          <p className="eyebrow">Detalle</p>
          <h3>{patientName}</h3>
          <small>Paciente #{patient.id_paciente}</small>
        </div>
      </div>

      <dl className="account-list compact-detail-list">
        <div>
          <dt>Email</dt>
          <dd>{formatValue(patient.email)}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{formatValue(patient.telefono)}</dd>
        </div>
        <div>
          <dt>Fecha de nacimiento</dt>
          <dd>{formatDate(patient.fecha_nacimiento)}</dd>
        </div>
        <div>
          <dt>Tipo de diabetes</dt>
          <dd>{formatValue(patient.tipo_diabetes, "No especificado")}</dd>
        </div>
      </dl>
    </aside>
  );
}

function getPatientName(patient: PatientDirectoryRow) {
  return [patient.nombre, patient.apellido].filter(Boolean).join(" ") || `Paciente #${patient.id_paciente}`;
}
