"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

export type MealRow = {
  id_comida: number;
  momento: string | null;
  descripcion: string | null;
  carbohidratos: number | null;
  calorias: number | null;
  proteinas: number | null;
  grasas: number | null;
  ig_nivel: "bajo" | "medio" | "alto" | string | null;
};

export type DietRow = {
  id_dieta: number;
  fecha_asignacion: string | null;
  objetivo_calorico: number | null;
  observaciones: string | null;
  estado: string | null;
  comidas?: MealRow[] | null;
};

export type MealComplianceRow = {
  id_comida: number | null;
  fecha: string | null;
  cumplido: boolean | null;
};

export function FoodPlanBoard({
  diets,
  initialCompliance,
  glucoseAverages
}: {
  diets: DietRow[];
  initialCompliance: MealComplianceRow[];
  glucoseAverages: Record<string, number>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(diets[0]?.id_dieta ?? null);
  const [completedMealIds, setCompletedMealIds] = useState(() => new Set(initialCompliance.filter((item) => item.cumplido && item.id_comida).map((item) => Number(item.id_comida))));
  const [pendingMealId, setPendingMealId] = useState<number | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const selected = diets.find((diet) => diet.id_dieta === selectedId) ?? diets[0] ?? null;
  const meals = useMemo(() => sortMeals(selected?.comidas ?? []), [selected]);
  const totals = useMemo(() => getTotals(meals), [meals]);
  const completedCount = meals.filter((meal) => completedMealIds.has(meal.id_comida)).length;
  const completionPercent = meals.length ? Math.round((completedCount / meals.length) * 100) : 0;
  const calorieGoal = Number(selected?.objetivo_calorico) || 0;
  const caloriePercent = calorieGoal ? Math.min(100, Math.round((totals.calories / calorieGoal) * 100)) : 0;

  async function markMealComplete(mealId: number) {
    if (completedMealIds.has(mealId) || pendingMealId) return;

    setPendingMealId(mealId);
    setCompletionError(null);

    const response = await fetch("/api/dashboard/cumplimiento-comidas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_comida: mealId })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setCompletionError(data.error ?? "No se pudo marcar la comida.");
      setPendingMealId(null);
      return;
    }

    setCompletedMealIds((current) => new Set(current).add(mealId));
    setPendingMealId(null);
  }

  if (!diets.length) {
    return (
      <section className="food-plan-empty">
        <p className="eyebrow">Plan alimentario</p>
        <h2>Todavía no hay un plan cargado</h2>
        <p>Cuando tu equipo médico asigne una dieta, vas a verla organizada por comidas, calorías y carbohidratos.</p>
      </section>
    );
  }

  return (
    <section className="food-plan-board">
      <div className="food-plan-hero">
        <div>
          <p className="eyebrow">Plan alimentario</p>
          <h2>Mapa nutricional</h2>
          <p>{selected ? `Plan asignado ${formatDate(selected.fecha_asignacion)}` : "Plan activo"}</p>
        </div>
        <div className="food-plan-score" aria-label="Objetivo calórico">
          <strong>{calorieGoal ? caloriePercent : "--"}{calorieGoal ? "%" : ""}</strong>
          <span>{calorieGoal ? `${totals.calories} / ${calorieGoal} kcal` : `${totals.calories} kcal`}</span>
        </div>
      </div>

      <div className="food-plan-tabs" aria-label="Planes cargados">
        {diets.map((diet) => (
          <button className={diet.id_dieta === selected?.id_dieta ? "active" : ""} type="button" onClick={() => setSelectedId(diet.id_dieta)} key={diet.id_dieta}>
            <span>{formatDate(diet.fecha_asignacion)}</span>
            <small>{formatStatus(diet.estado)}</small>
          </button>
        ))}
      </div>

      <div className="food-plan-layout">
        <article className="meal-timeline">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Distribución diaria</p>
              <h2>Comidas del plan</h2>
            </div>
            <span className="meal-compliance-summary">Cumpliste {completedCount}/{meals.length} comidas hoy</span>
          </div>
          {completionError ? <p className="form-error">{completionError}</p> : null}
          {meals.length ? (
            <div className="meal-track">
              {meals.map((meal, index) => {
                const completed = completedMealIds.has(meal.id_comida);
                const glucoseAverage = glucoseAverages[normalizeMoment(meal.momento)];

                return (
                  <section className={`meal-card ${completed ? "completed" : ""}`} key={meal.id_comida}>
                    <span className="meal-index">{index + 1}</span>
                    <div>
                      <div className="meal-card-heading">
                        <p>{formatValue(meal.momento, "Comida")}</p>
                        <button className="meal-complete-button" type="button" onClick={() => markMealComplete(meal.id_comida)} disabled={completed || pendingMealId === meal.id_comida}>
                          {completed ? "✓ Ya comiste esto" : pendingMealId === meal.id_comida ? "Marcando..." : "✓ Ya comí esto"}
                        </button>
                      </div>
                      <h3>{formatValue(meal.descripcion, "Sin descripción")}</h3>
                      <div className="meal-macros">
                        <span>{meal.carbohidratos ?? 0} g CH</span>
                        <span className={`ig-badge ${normalizeIgLevel(meal.ig_nivel)}`}>IG {formatIgLevel(meal.ig_nivel)}</span>
                        <span>{meal.proteinas ?? 0} g proteína</span>
                        <span>{meal.grasas ?? 0} g grasa</span>
                        <span>{meal.calorias ?? 0} kcal</span>
                      </div>
                      <p className="meal-glucose-insight">
                        {glucoseAverage ? `Glucemia ${formatMomentForGlucose(meal.momento)} promedio: ${glucoseAverage} mg/dL` : `Sin registros de glucemia para ${formatValue(meal.momento, "este momento").toLowerCase()} en los últimos 7 días.`}
                      </p>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">Este plan todavía no tiene comidas cargadas.</p>
          )}
        </article>

        <aside className="food-plan-detail">
          <span className={`food-plan-status ${normalizeStatus(selected?.estado)}`}>{formatStatus(selected?.estado)}</span>
          <h3>Lectura rápida</h3>
          <div className="macro-rings">
            <div className="macro-ring calories" style={{ "--value": `${completionPercent}%` } as CSSProperties}>
              <strong>{totals.calories}</strong>
              <span>kcal</span>
            </div>
            <div className="macro-ring carbs" style={{ "--value": `${completionPercent}%` } as CSSProperties}>
              <strong>{totals.carbs}</strong>
              <span>g CH</span>
            </div>
            <div className="macro-ring protein" style={{ "--value": `${completionPercent}%` } as CSSProperties}>
              <strong>{totals.protein}</strong>
              <span>g prot.</span>
            </div>
            <div className="macro-ring fats" style={{ "--value": `${completionPercent}%` } as CSSProperties}>
              <strong>{totals.fats}</strong>
              <span>g grasa</span>
            </div>
          </div>
          <dl className="food-plan-lines">
            <Info label="Objetivo" value={calorieGoal ? `${calorieGoal} kcal` : "No cargado"} />
            <Info label="Comidas" value={`${meals.length}`} />
            <Info label="Cumplimiento hoy" value={`${completedCount}/${meals.length} comidas`} />
            <Info label="Observaciones" value={formatValue(selected?.observaciones)} />
          </dl>
        </aside>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function sortMeals(meals: MealRow[]) {
  return [...meals].sort((left, right) => mealOrder(left.momento) - mealOrder(right.momento));
}

function mealOrder(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("desayuno")) return 1;
  if (normalized.includes("almuerzo")) return 2;
  if (normalized.includes("merienda")) return 3;
  if (normalized.includes("cena")) return 4;
  return 5;
}

function getTotals(meals: MealRow[]) {
  return {
    calories: meals.reduce((sum, meal) => sum + (Number(meal.calorias) || 0), 0),
    carbs: meals.reduce((sum, meal) => sum + (Number(meal.carbohidratos) || 0), 0),
    protein: meals.reduce((sum, meal) => sum + (Number(meal.proteinas) || 0), 0),
    fats: meals.reduce((sum, meal) => sum + (Number(meal.grasas) || 0), 0)
  };
}

function normalizeIgLevel(value: string | null | undefined) {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "bajo" || normalized === "medio" || normalized === "alto") return normalized;
  return "medio";
}

function formatIgLevel(value: string | null | undefined) {
  const level = normalizeIgLevel(value);
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function normalizeMoment(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function formatMomentForGlucose(value: string | null | undefined) {
  const normalized = formatValue(value, "del momento").toLowerCase();
  return normalized.startsWith("post") || normalized.startsWith("después") ? normalized : `post-${normalized}`;
}

function normalizeStatus(value: string | null | undefined) {
  const status = value?.toLowerCase().trim();
  if (status === "activa" || status === "pausada" || status === "finalizada") return status;
  return "activa";
}

function formatStatus(value: string | null | undefined) {
  const status = normalizeStatus(value);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatValue(value: string | number | null | undefined, fallback = "No cargado") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
