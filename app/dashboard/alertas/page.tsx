import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AlertRow = {
  id_alerta: number;
  tipo: string | null;
  valor_disparador: number | string | null;
  fecha: string | null;
  vista: boolean | null;
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

export default async function AlertsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const alerts = await getAlerts(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="alertas" subtitle="Alertas clínicas registradas.">
      <DataList
        eyebrow="Alertas"
        title="Alertas registradas"
        emptyMessage="Todavía no hay alertas cargadas."
        items={alerts.map(toListItem)}
      />
    </DashboardShell>
  );
}

async function getAlerts(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();

    if (role === "paciente") {
      const { data, error } = await supabase
        .from("alerta")
        .select("id_alerta,tipo,valor_disparador,fecha,vista,pacientes(nombre,apellido)")
        .eq("id_paciente", userId)
        .order("fecha", { ascending: false });

      if (error) {
        console.error(error);
        return [];
      }

      return (data ?? []) as AlertRow[];
    }

    const { data, error } = await supabase
      .from("alerta")
      .select("id_alerta,tipo,valor_disparador,fecha,vista,pacientes!inner(nombre,apellido,id_medico_cabecera)")
      .eq("pacientes.id_medico_cabecera", userId)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as AlertRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(alert: AlertRow): ListItem {
  return {
    id: alert.id_alerta,
    title: formatValue(alert.tipo, "Alerta"),
    meta: formatPatientName(alert.pacientes),
    details: [
      { label: "Valor disparador", value: formatValue(alert.valor_disparador) },
      { label: "Fecha", value: formatDateTime(alert.fecha) },
      { label: "Vista", value: alert.vista ? "Sí" : "No" }
    ]
  };
}
