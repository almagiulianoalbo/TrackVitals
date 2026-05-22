import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentSession();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Ingresar" subtitle="Accede a tu cuenta de TrackVitals.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
