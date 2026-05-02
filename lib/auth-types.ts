export const USER_ROLES = ["paciente", "medico"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type SessionUser = {
  role: UserRole;
  userId: number;
  email: string;
  name: string;
};

export const roleLabels: Record<UserRole, string> = {
  paciente: "Paciente",
  medico: "Medico"
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
