"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

export type MealRow = {
  id_comida: number;
  momento: string | null;
  descripcion: string | null;
  carbohidratos: number | null;
  calorias: number | null;
};

export type DietRow = {
  id_dieta: number;
  fecha_asignacion: string | null;
  objetivo_calorico: number | null;
  observaciones: string | null;
  estado: string | null;
  comidas?: MealRow[] | null;
};

export function FoodPlanBoard({ diets }: { diets: DietRow[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(diets[0]?.id_dieta ?? null);
  const selected = diets.find((diet) => diet.id_dieta === selectedId) ?? diets[0] ?? null;
  const meals = useMemo(() => sortMeals(selected?.comidas ?? []), [selected]);
  const totals = useMemo(() => getTotals(meals), [meals]);
  const calorieGoal = Number(selected?.objetivo_calorico) || 0;
  const caloriePercent = calorieGoal ? Math.min(100, Math.round((totals.calories / calorieGoal) * 100)) : 0;

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
          </div>
          {meals.length ? (
            <div className="meal-track">
              {meals.map((meal, index) => (
                <section className="meal-card" key={meal.id_comida}>
                  <span className="meal-index">{index + 1}</span>
                  <div>
                    <p>{formatValue(meal.momento, "Comida")}</p>
                    <h3>{formatValue(meal.descripcion, "Sin descripción")}</h3>
                    <div className="meal-macros">
                      <span>{meal.carbohidratos ?? 0} g CH</span>
                      <span>{meal.calorias ?? 0} kcal</span>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="empty-state">Este plan todavía no tiene comidas cargadas.</p>
          )}
        </article>

        <aside className="food-plan-detail">
          <span className={`food-plan-status ${normalizeStatus(selected?.estado)}`}>{formatStatus(selected?.estado)}</span>
          <h3>Lectura rápida</h3>
          <div className="macro-rings">
            <div className="macro-ring calories" style={{ "--value": `${caloriePercent}%` } as CSSProperties}>
              <strong>{totals.calories}</strong>
              <span>kcal</span>
            </div>
            <div className="macro-ring carbs" style={{ "--value": `${Math.min(100, totals.carbs)}%` } as CSSProperties}>
              <strong>{totals.carbs}</strong>
              <span>g CH</span>
            </div>
          </div>
          <dl className="food-plan-lines">
            <Info label="Objetivo" value={calorieGoal ? `${calorieGoal} kcal` : "No cargado"} />
            <Info label="Comidas" value={`${meals.length}`} />
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
    carbs: meals.reduce((sum, meal) => sum + (Number(meal.carbohidratos) || 0), 0)
  };
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
