import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { unauthorizedList } from "@/components/dashboard/DataViews";
import { SignsExplorer, type SignExplorerRow } from "@/components/SignsExplorer";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function RegisterSignsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  if (user.role !== "medico") {
    return (
      <DashboardShell user={user} activeItem="registrar-signos" subtitle="Registros clínicos de pacientes.">
        {unauthorizedList("registrar-signos")}
      </DashboardShell>
    );
  }

  const signs = await getSigns(user.userId);

  return (
    <DashboardShell user={user} activeItem="registrar-signos" subtitle="Registros clínicos de tus pacientes.">
      <SignsExplorer signs={signs} />
    </DashboardShell>
  );
}

async function getSigns(doctorId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("registros_diarios")
      .select(
        "id_registro,fecha_hora,momento,glucemia_mgdl,carbohidratos_g,tipo_insulina,dosis_unidades,pacientes!inner(nombre,apellido,id_medico_cabecera)"
      )
      .eq("pacientes.id_medico_cabecera", doctorId)
      .order("fecha_hora", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as SignExplorerRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}
