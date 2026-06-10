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
  hideTopbar?: boolean;
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href?: string;
  key?: DashboardNavKey;
};

export async function DashboardShell({ user, activeItem, subtitle, hideTopbar = false, children }: DashboardShellProps) {
  const showTopbar = activeItem === "panel" && !hideTopbar;
  const [photoUrl, unreadMessageCount] = await Promise.all([
    showTopbar ? getUserPhotoUrl(user) : Promise.resolve(null),
    getUnreadMessageCount(user)
  ]);

  return (
    <main className="dashboard-shell">
      <DashboardSidebar user={user} activeItem={activeItem} unreadMessageCount={unreadMessageCount} />

      <section className="dashboard-main">
        {showTopbar ? (
          <header className="dashboard-topbar">
            <div className="dashboard-title">
              <div className="topbar-profile">
                <span className="topbar-avatar" aria-hidden="true">
                  {photoUrl ? <img src={photoUrl} alt="" /> : getInitials(user.name)}
                </span>
                <div>
                  <p className="eyebrow">{roleLabels[user.role]}</p>
                  <h1>{user.name}</h1>
                </div>
              </div>
              <p>{subtitle}</p>
            </div>
            <LogoutButton />
          </header>
        ) : null}

        {children}
      </section>
    </main>
  );
}

function DashboardSidebar({
  user,
  activeItem,
  unreadMessageCount
}: {
  user: SessionUser;
  activeItem: DashboardNavKey;
  unreadMessageCount: number;
}) {
  const items: NavItem[] =
    user.role === "medico"
      ? [
          { label: "Panel principal", href: "/dashboard", key: "panel" },
          { label: "Mis pacientes", href: "/dashboard/mis-pacientes", key: "pacientes" },
          { label: "Prescripciones", href: "/dashboard/prescripciones", key: "prescripciones" },
          { label: "Registros clínicos", href: "/dashboard/registrar-signos", key: "registrar-signos" },
          { label: "Turnos", href: "/dashboard/turnos", key: "turnos" },
          { label: "Alertas", href: "/dashboard/alertas", key: "alertas" },
          { label: "Mensajes", href: "/dashboard/mensajes", key: "mensajes" },
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
        <Image src="/logo-trackvitals-real.png" alt="TrackVitals" width={72} height={58} priority />
        <div>
          <strong className="sidebar-wordmark">
            <span>Track</span>
            <span>Vitals</span>
          </strong>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const isActive = item.key === activeItem;
          const content = (
            <>
              <span aria-hidden="true" />
              {item.label}
              {item.key === "mensajes" && unreadMessageCount > 0 ? (
                <b className="sidebar-badge" aria-label={`${unreadMessageCount} mensajes sin leer`}>
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </b>
              ) : null}
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

async function getUnreadMessageCount(user: SessionUser) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = user.role === "medico" ? "id_medico" : "id_paciente";
    const { count, error } = await supabase
      .from("mensajes")
      .select("id_mensaje", { count: "exact", head: true })
      .eq(filterColumn, user.userId)
      .neq("remitente", user.role)
      .eq("leido", false);

    if (error) {
      console.error(error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error(error);
    return 0;
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
