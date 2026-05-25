import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { AlertsCenter, type AlertCenterRow } from "@/components/AlertsCenter";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function AlertsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const alerts = await getAlerts(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="alertas" subtitle="Alertas clínicas registradas.">
      <AlertsCenter alerts={alerts} />
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

      return (data ?? []) as AlertCenterRow[];
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

    return (data ?? []) as AlertCenterRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}
