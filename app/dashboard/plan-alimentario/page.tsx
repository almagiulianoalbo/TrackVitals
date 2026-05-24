import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem, unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDate, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MealRow = {
  id_comida: number;
  momento: string | null;
  descripcion: string | null;
  carbohidratos: number | null;
  calorias: number | null;
};

type DietRow = {
  id_dieta: number;
  fecha_asignacion: string | null;
  objetivo_calorico: number | null;
  observaciones: string | null;
  estado: string | null;
  comidas?: MealRow[] | null;
};

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
      <DataList
        eyebrow="Plan alimentario"
        title="Dietas cargadas"
        emptyMessage="Todavía no hay plan alimentario cargado."
        items={diets.map(toListItem)}
      />
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

function toListItem(diet: DietRow): ListItem {
  const meals = diet.comidas?.length
    ? diet.comidas
        .map((meal) =>
          [
            formatValue(meal.momento, "Comida"),
            formatValue(meal.descripcion),
            meal.carbohidratos ? `${meal.carbohidratos} g CH` : null,
            meal.calorias ? `${meal.calorias} kcal` : null
          ]
            .filter(Boolean)
            .join(" · ")
        )
        .join(" / ")
    : "Sin comidas cargadas";

  return {
    id: diet.id_dieta,
    title: `Plan del ${formatDate(diet.fecha_asignacion)}`,
    meta: formatValue(diet.estado, "Sin estado"),
    details: [
      { label: "Objetivo calórico", value: diet.objetivo_calorico ? `${diet.objetivo_calorico} kcal` : "No cargado" },
      { label: "Observaciones", value: formatValue(diet.observaciones) },
      { label: "Comidas", value: meals }
    ]
  };
}
