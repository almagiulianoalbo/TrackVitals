import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { PrescriptionsBoard, type PrescriptionBoardRow } from "@/components/PrescriptionsBoard";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function PrescriptionsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const prescriptions = await getPrescriptions(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="prescripciones" subtitle="Indicaciones médicas y tratamientos.">
      <PrescriptionsBoard prescriptions={prescriptions} />
    </DashboardShell>
  );
}

async function getPrescriptions(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = role === "medico" ? "id_medico" : "id_paciente";
    const { data, error } = await supabase
      .from("prescripciones")
      .select("id_prescripcion,titulo,indicaciones,medicamento,dosis,unidad,frecuencia,fecha_inicio,fecha_fin,estado,pacientes(nombre,apellido)")
      .eq(filterColumn, userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as PrescriptionBoardRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}
