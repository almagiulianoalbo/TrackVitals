import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentSession } from "@/lib/auth";
import { roleLabels } from "@/lib/auth-types";

export default async function DashboardPage() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  const isDoctor = user.role === "medico";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <Image src="/logo.png" alt="TrackVitals" width={86} height={67} priority />
          <div>
            <p className="eyebrow">{roleLabels[user.role]}</p>
            <h1>Hola, {user.name}</h1>
          </div>
        </div>
        <LogoutButton />
      </header>

      <section className="dashboard-grid" aria-label="Panel principal">
        <article className="dashboard-card highlight-card">
          <p className="eyebrow">Sesion activa</p>
          <h2>{isDoctor ? "Panel medico" : "Panel del paciente"}</h2>
          <p>
            {isDoctor
              ? "El proximo paso puede ser listar pacientes asignados y revisar sus controles."
              : "El proximo paso puede ser registrar mediciones y compartirlas con el equipo medico."}
          </p>
        </article>

        <article className="dashboard-card">
          <p className="eyebrow">Cuenta</p>
          <dl className="account-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>{user.userId}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{roleLabels[user.role]}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}
