import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getCurrentSession();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Configura tu acceso como paciente o medico.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
