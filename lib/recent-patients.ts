export const DOCTOR_RECENT_PATIENTS_KEY = "trackvitals:doctor-recent-patients";

export function readRecentPatientIds(limit = 8) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(DOCTOR_RECENT_PATIENTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, limit);
  } catch {
    return [];
  }
}

export function rememberRecentPatient(patientId: number, limit = 8) {
  if (typeof window === "undefined" || !Number.isSafeInteger(patientId) || patientId < 1) return [];

  const nextIds = [patientId, ...readRecentPatientIds(limit).filter((id) => id !== patientId)].slice(0, limit);
  window.localStorage.setItem(DOCTOR_RECENT_PATIENTS_KEY, JSON.stringify(nextIds));
  return nextIds;
}
