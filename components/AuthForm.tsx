"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { roleLabels, type UserRole } from "@/lib/auth-types";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("paciente");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

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
        setError(result.error ?? "No se pudo completar la operacion.");
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
      <div className="role-switch" aria-label="Tipo de usuario">
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
        <Field label="Matricula" name="matricula" autoComplete="off" required />
      ) : null}

      {isRegister && role === "paciente" ? (
        <>
          <div className="field-grid">
            <Field label="DNI" name="dni" inputMode="numeric" autoComplete="off" required />
            <Field label="Telefono" name="telefono" inputMode="tel" autoComplete="tel" />
          </div>
          <div className="field-grid">
            <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
            <label className="field">
              <span>Sexo</span>
              <select name="sexo" defaultValue="">
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="X">Otro</option>
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
            <Field label="ID medico cabecera" name="id_medico_cabecera" inputMode="numeric" />
          </div>
        </>
      ) : null}

      <Field
        label="Contrasena"
        name="password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        minLength={isRegister ? 8 : undefined}
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
        <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Ingresar" : "Crear cuenta"}</Link>
      </p>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
};

function Field({ label, name, ...props }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} {...props} />
    </label>
  );
}
