"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { roleLabels, type UserRole } from "@/lib/auth-types";

type AuthFormProps = {
  mode: "login" | "register";
};

type DoctorOption = {
  id_medico: number;
  nombre: string;
  apellido: string;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("paciente");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState("");
  const isRegister = mode === "register";

  useEffect(() => {
    if (!isRegister || role !== "paciente") return;

    let ignore = false;
    setIsLoadingDoctors(true);
    setDoctorsError("");

    fetch("/api/auth/medicos")
      .then(async (response) => {
        const result = (await response.json()) as { medicos?: DoctorOption[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "No se pudo cargar la lista de médicos.");
        if (!ignore) setDoctors(result.medicos ?? []);
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setDoctorsError(requestError instanceof Error ? requestError.message : "No se pudo cargar la lista de médicos.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingDoctors(false);
      });

    return () => {
      ignore = true;
    };
  }, [isRegister, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...payload, role })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "No se pudo completar la operación.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="role-switch" data-role={role} aria-label="Tipo de usuario">
        {(["paciente", "medico"] as const).map((item) => (
          <button
            type="button"
            key={item}
            className={role === item ? "active" : ""}
            onClick={() => setRole(item)}
          >
            {roleLabels[item]}
          </button>
        ))}
      </div>

      {isRegister ? (
        <div className="field-grid">
          <Field label="Nombre" name="nombre" autoComplete="given-name" required />
          <Field label="Apellido" name="apellido" autoComplete="family-name" required />
        </div>
      ) : null}

      <Field label="Email" name="email" type="email" autoComplete="email" required />

      {isRegister && role === "medico" ? (
        <Field label="Matrícula" name="matricula" autoComplete="off" required />
      ) : null}

      {isRegister && role === "paciente" ? (
        <>
          <div className="field-grid">
            <Field label="DNI" name="dni" inputMode="numeric" autoComplete="off" required />
            <Field label="Teléfono" name="telefono" inputMode="tel" autoComplete="tel" />
          </div>
          <div className="field-grid">
            <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
            <label className="field">
              <span>Sexo</span>
              <select name="sexo" defaultValue="">
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="X">Otro / prefiero no especificar</option>
              </select>
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Tipo de diabetes</span>
              <select name="tipo_diabetes" defaultValue="">
                <option value="">Sin especificar</option>
                <option value="tipo_1">Tipo 1</option>
                <option value="tipo_2">Tipo 2</option>
                <option value="gestacional">Gestacional</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="field">
              <span>Médico de cabecera</span>
              <select name="id_medico_cabecera" defaultValue="" disabled={isLoadingDoctors}>
                <option value="">{isLoadingDoctors ? "Cargando médicos..." : "Sin médico asignado"}</option>
                {doctors.map((doctor) => (
                  <option value={doctor.id_medico} key={doctor.id_medico}>
                    {doctor.nombre} {doctor.apellido} - ID: {doctor.id_medico}
                  </option>
                ))}
              </select>
              {doctorsError ? <small className="field-help field-help-error">{doctorsError}</small> : null}
            </label>
          </div>
        </>
      ) : null}

      <Field
        label="Contraseña"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete={isRegister ? "new-password" : "current-password"}
        minLength={isRegister ? 8 : undefined}
        endAdornment={
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        required
      />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Procesando..." : isRegister ? "Crear cuenta" : "Ingresar"}
      </button>

      <p className="auth-link">
        {isRegister ? "Ya tienes cuenta?" : "No tienes cuenta?"}{" "}
        <a href={isRegister ? "/login#acceso" : "/register#acceso"}>{isRegister ? "Ingresar" : "Crear cuenta"}</a>
      </p>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a18.2 18.2 0 0 1-3.1 3.7" />
      <path d="M6.4 6.7A18.2 18.2 0 0 0 2.5 12s3.5 6 9.5 6a10.2 10.2 0 0 0 4.1-.8" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </svg>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  endAdornment?: React.ReactNode;
};

function Field({ label, name, endAdornment, ...props }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {endAdornment ? (
        <span className="input-with-action">
          <input name={name} {...props} />
          {endAdornment}
        </span>
      ) : (
        <input name={name} {...props} />
      )}
    </label>
  );
}
