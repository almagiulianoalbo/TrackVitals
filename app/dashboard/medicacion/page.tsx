import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { MedicationStudio, type MedicationRow } from "@/components/MedicationStudio";
import { unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
      <MedicationStudio medications={medications} />
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
