import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { FoodPlanBoard, type DietRow } from "@/components/FoodPlanBoard";
import { unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function FoodPlanPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  if (user.role !== "paciente") {
    return (
      <DashboardShell user={user} activeItem="plan-alimentario" subtitle="Plan alimentario asignado.">
        {unauthorizedList("plan-alimentario")}
      </DashboardShell>
    );
  }

  const diets = await getDiets(user.userId);

  return (
    <DashboardShell user={user} activeItem="plan-alimentario" subtitle="Plan alimentario asignado.">
      <FoodPlanBoard diets={diets} />
    </DashboardShell>
  );
}

async function getDiets(patientId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("dietas")
      .select("id_dieta,fecha_asignacion,objetivo_calorico,observaciones,estado,comidas(id_comida,momento,descripcion,carbohidratos,calorias)")
      .eq("id_paciente", patientId)
      .order("fecha_asignacion", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as DietRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}
