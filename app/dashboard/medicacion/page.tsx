import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem, unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDate, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MedicationRow = {
  id_medicamento: number;
  nombre: string | null;
  dosis: number | string | null;
  unidad: string | null;
  frecuencia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
};

export default async function MedicationPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  if (user.role !== "paciente") {
    return (
      <DashboardShell user={user} activeItem="medicacion" subtitle="Medicación indicada.">
        {unauthorizedList("medicacion")}
      </DashboardShell>
    );
  }

  const medications = await getMedications(user.userId);

  return (
    <DashboardShell user={user} activeItem="medicacion" subtitle="Medicación indicada y dosis actuales.">
      <DataList
        eyebrow="Medicación"
        title="Medicamentos cargados"
        emptyMessage="Todavía no hay medicación cargada."
        items={medications.map(toListItem)}
      />
    </DashboardShell>
  );
}

async function getMedications(patientId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("medicamentos")
      .select("id_medicamento,nombre,dosis,unidad,frecuencia,fecha_inicio,fecha_fin,estado")
      .eq("id_paciente", patientId)
      .order("fecha_inicio", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as MedicationRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(medication: MedicationRow): ListItem {
  const dose = [medication.dosis, medication.unidad].filter(Boolean).join(" ");

  return {
    id: medication.id_medicamento,
    title: medication.nombre || `Medicamento #${medication.id_medicamento}`,
    meta: formatValue(medication.estado, "Sin estado"),
    details: [
      { label: "Dosis", value: dose || "No cargado" },
      { label: "Frecuencia", value: formatValue(medication.frecuencia) },
      { label: "Inicio", value: formatDate(medication.fecha_inicio) },
      { label: "Fin", value: formatDate(medication.fecha_fin) }
    ]
  };
}
