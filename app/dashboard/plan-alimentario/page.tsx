import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { FoodPlanBoard, type DietRow, type MealComplianceRow } from "@/components/FoodPlanBoard";
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
  const mealIds = diets.flatMap((diet) => diet.comidas?.map((meal) => meal.id_comida) ?? []);
  const [compliance, glucoseAverages] = await Promise.all([getTodayCompliance(user.userId, mealIds), getGlucoseAverages(user.userId)]);

  return (
    <DashboardShell user={user} activeItem="plan-alimentario" subtitle="Plan alimentario asignado.">
      <FoodPlanBoard diets={diets} initialCompliance={compliance} glucoseAverages={glucoseAverages} />
    </DashboardShell>
  );
}

async function getDiets(patientId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("dietas")
      .select("id_dieta,fecha_asignacion,objetivo_calorico,observaciones,estado,comidas(id_comida,momento,descripcion,carbohidratos,calorias,proteinas,grasas,ig_nivel)")
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

async function getTodayCompliance(patientId: number, mealIds: number[]): Promise<MealComplianceRow[]> {
  if (!mealIds.length) return [];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("cumplimiento_comidas")
      .select("id_comida,fecha,cumplido")
      .eq("id_paciente", patientId)
      .eq("fecha", getLocalDateKey(new Date()))
      .in("id_comida", mealIds);

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as MealComplianceRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getGlucoseAverages(patientId: number) {
  try {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const { data, error } = await getSupabaseAdmin()
      .from("registros_diarios")
      .select("momento,glucemia_mgdl")
      .eq("id_paciente", patientId)
      .gte("fecha_hora", toSupabaseTimestamp(start));

    if (error) {
      console.error(error);
      return {};
    }

    const grouped = new Map<string, number[]>();

    (data ?? []).forEach((record) => {
      const key = normalizeMoment(record.momento);
      const value = Number(record.glucemia_mgdl);
      if (!key || !Number.isFinite(value)) return;

      grouped.set(key, [...(grouped.get(key) ?? []), value]);
    });

    return Object.fromEntries(
      [...grouped.entries()].map(([key, values]) => [
        key,
        Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      ])
    );
  } catch (error) {
    console.error(error);
    return {};
  }
}

function normalizeMoment(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "";
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
