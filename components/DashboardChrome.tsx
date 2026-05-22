import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { roleLabels, type SessionUser } from "@/lib/auth-types";

type DashboardShellProps = {
  user: SessionUser;
  activeItem: "panel" | "perfil";
  subtitle: string;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href?: string;
  key?: "panel" | "perfil";
};

export function DashboardShell({ user, activeItem, subtitle, children }: DashboardShellProps) {
  return (
    <main className="dashboard-shell">
      <DashboardSidebar user={user} activeItem={activeItem} />

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

function DashboardSidebar({ user, activeItem }: { user: SessionUser; activeItem: "panel" | "perfil" }) {
  const items: NavItem[] =
    user.role === "medico"
      ? [
          { label: "Panel principal", href: "/dashboard", key: "panel" },
          { label: "Mis pacientes" },
          { label: "Prescripciones" },
          { label: "Registrar signos" },
          { label: "Turnos" },
          { label: "Alertas" },
          { label: "Perfil", href: "/dashboard/perfil", key: "perfil" }
        ]
      : [
          { label: "Panel principal", href: "/dashboard", key: "panel" },
          { label: "Mis registros" },
          { label: "Medicación" },
          { label: "Plan alimentario" },
          { label: "Turnos" },
          { label: "Mensajes" },
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
        <span aria-hidden="true">{getInitials(user.name)}</span>
        <div>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>
      </div>
    </aside>
  );
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
