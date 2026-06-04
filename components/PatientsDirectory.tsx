"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/components/DashboardChrome";
import { PatientLinkFields } from "@/components/PatientLinkFields";
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

const initialSubmitState = {
  loading: false,
  error: null as string | null
};

export function PatientsDirectory({ patients }: { patients: PatientDirectoryRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [submitState, setSubmitState] = useState(initialSubmitState);
  const [selectedId, setSelectedId] = useState<number | null>(patients[0]?.id_paciente ?? null);
  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return patients;
    return patients.filter((patient) => getPatientName(patient).toLowerCase().includes(normalizedQuery) || patient.email?.toLowerCase().includes(normalizedQuery));
  }, [patients, query]);
  const selectedPatient = patients.find((patient) => patient.id_paciente === selectedId) ?? filteredPatients[0] ?? null;

  function closeLinkModal() {
    if (submitState.loading) return;
    setSubmitState(initialSubmitState);
    setIsLinkModalOpen(false);
  }

  async function submitLinkPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    setSubmitState({ loading: true, error: null });

    try {
      const response = await fetch("/api/dashboard/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setSubmitState({ loading: false, error: data.error ?? "No se pudo agregar el paciente." });
        return;
      }

      form.reset();
      setQuery("");
      setIsLinkModalOpen(false);
      setSubmitState(initialSubmitState);
      router.refresh();
    } catch {
      setSubmitState({ loading: false, error: "No se pudo conectar con el servidor." });
    }
  }

  return (
    <section className="patients-directory">
      <div className="patients-directory-hero">
        <div>
          <p className="eyebrow">Mis pacientes</p>
          <h2>Directorio clínico</h2>
          <p>Buscá y revisá la información clave sin llenar la pantalla de datos.</p>
        </div>
        <div className="patients-directory-actions">
          <span>{patients.length} pacientes</span>
          <button className="primary-button" type="button" onClick={() => setIsLinkModalOpen(true)}>
            Agregar paciente
          </button>
        </div>
      </div>

      <label className="directory-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, apellido o email" />
      </label>

      <div className="patients-directory-layout">
        <section className="patients-compact-list" aria-label="Lista de pacientes">
          {filteredPatients.length ? (
            filteredPatients.map((patient) => (
              <button
                className={selectedPatient?.id_paciente === patient.id_paciente ? "active" : ""}
                key={patient.id_paciente}
                type="button"
                onClick={() => setSelectedId(patient.id_paciente)}
              >
                <span className="avatar-badge small">{getInitials(getPatientName(patient))}</span>
                <span>
                  <strong>{getPatientName(patient)}</strong>
                  <small>{formatValue(patient.email)}</small>
                </span>
                <em>{formatDiabetes(patient.tipo_diabetes)}</em>
              </button>
            ))
          ) : (
            <p className="empty-state">No se encontraron pacientes.</p>
          )}
        </section>

        <article className="dashboard-card patient-detail-panel">
          {selectedPatient ? (
            <>
              <div className="patient-detail-header">
                <span className="avatar-badge">{getInitials(getPatientName(selectedPatient))}</span>
                <div>
                  <p className="eyebrow">Paciente seleccionado</p>
                  <h2>{getPatientName(selectedPatient)}</h2>
                  <small>Paciente #{selectedPatient.id_paciente}</small>
                </div>
              </div>

              <div className="patient-detail-feature">
                <span>Condición principal</span>
                <strong>{formatDiabetes(selectedPatient.tipo_diabetes)}</strong>
              </div>

              <dl className="patient-detail-grid">
                <Info label="Email" value={selectedPatient.email} />
                <Info label="Teléfono" value={selectedPatient.telefono} />
                <Info label="Nacimiento" value={formatDate(selectedPatient.fecha_nacimiento)} />
                <Info label="Edad" value={formatAge(selectedPatient.fecha_nacimiento)} />
              </dl>
            </>
          ) : (
            <p className="empty-state">No hay pacientes para mostrar.</p>
          )}
        </article>
      </div>

      {isLinkModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="patient-link-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Directorio clínico</p>
                <h2 id="patient-link-title">Agregar paciente</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeLinkModal} disabled={submitState.loading} aria-label="Cerrar">
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={submitLinkPatient}>
              <PatientLinkFields />

              {submitState.error ? <p className="form-error">{submitState.error}</p> : null}
              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={submitState.loading}>
                  {submitState.loading ? "Guardando..." : "Agregar paciente"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
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

function getPatientName(patient: PatientDirectoryRow) {
  return `${patient.nombre ?? ""} ${patient.apellido ?? ""}`.trim() || `Paciente #${patient.id_paciente}`;
}

function formatDiabetes(value: string | null) {
  if (!value) return "Sin especificar";
  return value.replaceAll("_", " ");
}

function formatAge(value: string | null) {
  if (!value) return "No cargado";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "No cargado";
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (birthdayThisYear > now) age -= 1;
  return `${age} años`;
}
