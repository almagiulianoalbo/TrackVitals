import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem, unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDateTime, formatPatientName, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type SignRow = {
  id_registro: number;
  fecha_hora: string;
  momento: string | null;
  glucemia_mgdl: number | null;
  carbohidratos_g: number | null;
  tipo_insulina: string | null;
  dosis_unidades: number | string | null;
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

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
      <DataList
        eyebrow="Registrar signos"
        title="Registros diarios"
        emptyMessage="Todavía no hay registros diarios para tus pacientes."
        items={signs.map(toListItem)}
      />
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

    return (data ?? []) as SignRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(sign: SignRow): ListItem {
  return {
    id: sign.id_registro,
    title: formatDateTime(sign.fecha_hora),
    meta: formatPatientName(sign.pacientes),
    details: [
      { label: "Momento", value: formatValue(sign.momento) },
      { label: "Glucemia", value: sign.glucemia_mgdl ? `${sign.glucemia_mgdl} mg/dL` : "No cargado" },
      { label: "Carbohidratos", value: sign.carbohidratos_g ? `${sign.carbohidratos_g} g` : "No cargado" },
      { label: "Tipo de insulina", value: formatValue(sign.tipo_insulina) },
      { label: "Dosis", value: sign.dosis_unidades ? `${sign.dosis_unidades} unidades` : "No cargado" }
    ]
  };
}
