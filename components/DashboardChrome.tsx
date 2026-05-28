import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { roleLabels, type SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type DashboardNavKey =
  | "panel"
  | "perfil"
  | "registros"
  | "pacientes"
  | "prescripciones"
  | "registrar-signos"
  | "turnos"
  | "alertas"
  | "medicacion"
  | "plan-alimentario"
  | "mensajes";

type DashboardShellProps = {
  user: SessionUser;
  activeItem: DashboardNavKey;
  subtitle: string;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href?: string;
  key?: DashboardNavKey;
};

export async function DashboardShell({ user, activeItem, subtitle, children }: DashboardShellProps) {
  const photoUrl = await getUserPhotoUrl(user);

  return (
    <main className="dashboard-shell">
      <DashboardSidebar user={user} activeItem={activeItem} photoUrl={photoUrl} />

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-title">
            <p className="eyebrow">{roleLabels[user.role]}</p>
            <h1>Hola, {user.name}</h1>
            <p>{subtitle}</p>
          </div>
          <LogoutButton />
        </header>

        {children}
      </section>
    </main>
  );
}

function DashboardSidebar({ user, activeItem, photoUrl }: { user: SessionUser; activeItem: DashboardNavKey; photoUrl: string | null }) {
  const items: NavItem[] =
    user.role === "medico"
      ? [
          { label: "Panel principal", href: "/dashboard", key: "panel" },
          { label: "Mis pacientes", href: "/dashboard/mis-pacientes", key: "pacientes" },
          { label: "Prescripciones", href: "/dashboard/prescripciones", key: "prescripciones" },
          { label: "Registrar signos", href: "/dashboard/registrar-signos", key: "registrar-signos" },
          { label: "Turnos", href: "/dashboard/turnos", key: "turnos" },
          { label: "Alertas", href: "/dashboard/alertas", key: "alertas" },
          { label: "Perfil", href: "/dashboard/perfil", key: "perfil" }
        ]
      : [
          { label: "Panel principal", href: "/dashboard", key: "panel" },
          { label: "Mis registros", href: "/dashboard/mis-registros", key: "registros" },
          { label: "Medicación", href: "/dashboard/medicacion", key: "medicacion" },
          { label: "Plan alimentario", href: "/dashboard/plan-alimentario", key: "plan-alimentario" },
          { label: "Turnos", href: "/dashboard/turnos", key: "turnos" },
          { label: "Mensajes", href: "/dashboard/mensajes", key: "mensajes" },
          { label: "Perfil", href: "/dashboard/perfil", key: "perfil" }
        ];

  return (
    <aside className="dashboard-sidebar" aria-label="Navegación principal">
      <div className="sidebar-brand">
        <Image src="/logo.png" alt="TrackVitals" width={84} height={66} priority />
        <div>
          <strong>TrackVitals</strong>
          <span>{roleLabels[user.role]}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const isActive = item.key === activeItem;
          const content = (
            <>
              <span aria-hidden="true" />
              {item.label}
            </>
          );

          return item.href ? (
            <Link className={isActive ? "active" : ""} href={item.href} key={item.label}>
              {content}
            </Link>
          ) : (
            <button type="button" key={item.label}>
              {content}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <span className="sidebar-avatar" aria-hidden="true">
          {photoUrl ? <img src={photoUrl} alt="" /> : getInitials(user.name)}
        </span>
        <div>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>
      </div>
    </aside>
  );
}

async function getUserPhotoUrl(user: SessionUser) {
  try {
    const supabase = getSupabaseAdmin();
    const table = user.role === "paciente" ? "pacientes" : "medicos";
    const idColumn = user.role === "paciente" ? "id_paciente" : "id_medico";
    const { data } = await supabase.from(table).select("foto_url").eq(idColumn, user.userId).maybeSingle();

    return typeof data?.foto_url === "string" && data.foto_url ? data.foto_url : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
