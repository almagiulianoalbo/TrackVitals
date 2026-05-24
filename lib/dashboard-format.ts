export function formatDateTime(value: unknown) {
  const date = parseDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "No cargado";
  }

  if (isDateOnly(value)) {
    return date.toLocaleDateString("es-AR", { dateStyle: "medium" });
  }

  return date.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value: unknown) {
  const date = parseDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "No cargado";
  }

  return date.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

export function formatValue(value: unknown, fallback = "No cargado") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

type PersonLike = { nombre?: string | null; apellido?: string | null };

export function formatPatientName(patient: PersonLike | PersonLike[] | null | undefined) {
  const normalizedPatient = Array.isArray(patient) ? patient[0] : patient;
  const fullName = [normalizedPatient?.nombre, normalizedPatient?.apellido].filter(Boolean).join(" ");
  return fullName || "Paciente no disponible";
}

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (isDateOnly(value)) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(String(value));
}

function isDateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
