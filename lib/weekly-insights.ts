import { getMongoDatabase } from "@/lib/mongodb";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AttentionLevel = "estable" | "observacion" | "prioritario" | "sin_datos";
type PatternTone = "good" | "info" | "warning" | "danger";

type ClinicalRecord = {
  id_registro: number;
  fecha_hora: string;
  momento: string | null;
  glucemia_mgdl: number | null;
  carbohidratos_g: number | null;
  tipo_insulina: string | null;
  dosis_unidades: number | string | null;
};

export type WeeklyInsightMetricSet = {
  totalRecords: number;
  daysWithRecords: number;
  averageGlucose: number | null;
  minGlucose: number | null;
  maxGlucose: number | null;
  timeInRange: number | null;
  hypoglycemiaCount: number;
  hyperglycemiaCount: number;
  variability: number | null;
  averageCarbs: number | null;
  insulinEvents: number;
};

export type WeeklyInsightPattern = {
  title: string;
  detail: string;
  tone: PatternTone;
  value?: string;
};

export type WeeklyInsightRecommendation = {
  title: string;
  detail: string;
};

export type WeeklyInsightDay = {
  date: string;
  label: string;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
};

export type WeeklyInsightDocument = {
  patientId: number;
  weekStart: string;
  weekEnd: string;
  summary: string;
  attentionLevel: AttentionLevel;
  metrics: WeeklyInsightMetricSet;
  patterns: WeeklyInsightPattern[];
  recommendations: WeeklyInsightRecommendation[];
  chartData: {
    daily: WeeklyInsightDay[];
    rangeDistribution: {
      low: number;
      inRange: number;
      high: number;
    };
  };
  generatedAt: string;
};

type WeekPeriod = {
  weekStart: string;
  weekEnd: string;
  startDate: Date;
  endDate: Date;
};

export async function getOrCreateWeeklyInsight(patientId: number) {
  const period = getCurrentWeekPeriod();
  const database = await getMongoDatabase();
  const collection = database.collection<WeeklyInsightDocument>("weekly_insights");

  await collection.createIndex(
    { patientId: 1, weekStart: 1, weekEnd: 1 },
    { unique: true, name: "weekly_insights_patient_week" }
  );

  const existing = await collection.findOne(
    { patientId, weekStart: period.weekStart, weekEnd: period.weekEnd },
    { projection: { _id: 0 } }
  );

  if (existing) {
    return existing;
  }

  const records = await getWeeklyRecords(patientId, period);
  const insight = buildWeeklyInsight(patientId, period, records);

  await collection.updateOne(
    { patientId, weekStart: period.weekStart, weekEnd: period.weekEnd },
    { $setOnInsert: insight },
    { upsert: true }
  );

  return (
    (await collection.findOne(
      { patientId, weekStart: period.weekStart, weekEnd: period.weekEnd },
      { projection: { _id: 0 } }
    )) ?? insight
  );
}

async function getWeeklyRecords(patientId: number, period: WeekPeriod) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("registros_diarios")
    .select("id_registro,fecha_hora,momento,glucemia_mgdl,carbohidratos_g,tipo_insulina,dosis_unidades")
    .eq("id_paciente", patientId)
    .gte("fecha_hora", toSupabaseTimestamp(period.startDate))
    .lte("fecha_hora", toSupabaseTimestamp(period.endDate))
    .order("fecha_hora", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("No se pudieron obtener los registros semanales.");
  }

  return (data ?? []) as ClinicalRecord[];
}

function buildWeeklyInsight(patientId: number, period: WeekPeriod, records: ClinicalRecord[]): WeeklyInsightDocument {
  const glucoseRecords = records.filter((record) => Number.isFinite(Number(record.glucemia_mgdl)));
  const values = glucoseRecords.map((record) => Number(record.glucemia_mgdl));
  const carbValues = records.map((record) => Number(record.carbohidratos_g)).filter(Number.isFinite);
  const lowCount = values.filter((value) => value < 70).length;
  const inRangeCount = values.filter((value) => value >= 70 && value <= 180).length;
  const highCount = values.filter((value) => value > 180).length;
  const averageGlucose = average(values);
  const metrics: WeeklyInsightMetricSet = {
    totalRecords: glucoseRecords.length,
    daysWithRecords: countDaysWithRecords(glucoseRecords),
    averageGlucose,
    minGlucose: values.length ? Math.min(...values) : null,
    maxGlucose: values.length ? Math.max(...values) : null,
    timeInRange: values.length ? Math.round((inRangeCount / values.length) * 100) : null,
    hypoglycemiaCount: lowCount,
    hyperglycemiaCount: highCount,
    variability: getStandardDeviation(values),
    averageCarbs: average(carbValues),
    insulinEvents: records.filter((record) => Number(record.dosis_unidades) > 0 || Boolean(record.tipo_insulina)).length
  };
  const attentionLevel = getAttentionLevel(metrics);
  const daily = buildDailyData(period, glucoseRecords);
  const patterns = buildPatterns(records, metrics);

  return {
    patientId,
    weekStart: period.weekStart,
    weekEnd: period.weekEnd,
    summary: buildSummary(metrics, attentionLevel),
    attentionLevel,
    metrics,
    patterns,
    recommendations: buildRecommendations(metrics, patterns),
    chartData: {
      daily,
      rangeDistribution: {
        low: lowCount,
        inRange: inRangeCount,
        high: highCount
      }
    },
    generatedAt: new Date().toISOString()
  };
}

function buildSummary(metrics: WeeklyInsightMetricSet, attentionLevel: AttentionLevel) {
  if (!metrics.totalRecords) {
    return "Todavía no hay registros suficientes esta semana. El primer insight útil aparece cuando cargás glucemias durante varios momentos del día.";
  }

  if (attentionLevel === "prioritario") {
    return "La semana muestra valores fuera de objetivo que conviene revisar con el equipo médico, especialmente por la frecuencia de picos o descensos.";
  }

  if (attentionLevel === "observacion") {
    return "La evolución semanal tiene una base útil, pero aparecen señales puntuales para observar: cobertura de registros, variabilidad o valores fuera de rango.";
  }

  return "La semana se ve mayormente estable: buena proporción de registros en rango y sin señales fuertes de descompensación.";
}

function buildPatterns(records: ClinicalRecord[], metrics: WeeklyInsightMetricSet): WeeklyInsightPattern[] {
  const patterns: WeeklyInsightPattern[] = [];
  const momentInsights = getMomentInsights(records);

  if (!metrics.totalRecords) {
    return [
      {
        title: "Sin base semanal suficiente",
        detail: "No hay glucemias cargadas para detectar tendencias. Registrar antes y después de comidas mejora mucho la lectura.",
        tone: "info"
      }
    ];
  }

  patterns.push({
    title: "Cobertura de datos",
    detail:
      metrics.daysWithRecords >= 5
        ? "Hay registros en la mayoría de los días de la semana, suficiente para detectar una tendencia razonable."
        : "La semana tiene pocos días con registros; el insight puede subestimar patrones reales.",
    tone: metrics.daysWithRecords >= 5 ? "good" : "warning",
    value: `${metrics.daysWithRecords}/7 días`
  });

  if (metrics.timeInRange !== null) {
    patterns.push({
      title: "Tiempo en rango",
      detail:
        metrics.timeInRange >= 75
          ? "La mayor parte de los controles quedó dentro del objetivo 70-180 mg/dL."
          : "Una proporción importante quedó fuera del objetivo; conviene revisar horarios, comidas o dosis.",
      tone: metrics.timeInRange >= 75 ? "good" : "warning",
      value: `${metrics.timeInRange}%`
    });
  }

  if (metrics.variability !== null) {
    patterns.push({
      title: "Variabilidad glucémica",
      detail:
        metrics.variability <= 35
          ? "Los valores se movieron con oscilaciones moderadas, sin grandes saltos entre registros."
          : "Se observan saltos amplios entre registros; puede ser útil analizar comidas, horarios e insulina.",
      tone: metrics.variability <= 35 ? "good" : "warning",
      value: `${metrics.variability} mg/dL`
    });
  }

  if (momentInsights.highest) {
    patterns.push({
      title: "Momento más sensible",
      detail: `${momentInsights.highest.label} concentra el promedio más alto de la semana.`,
      tone: momentInsights.highest.average > 180 ? "danger" : "info",
      value: `${momentInsights.highest.average} mg/dL`
    });
  }

  if (metrics.hypoglycemiaCount > 0) {
    patterns.push({
      title: "Eventos bajos",
      detail: "Aparecieron glucemias por debajo de 70 mg/dL. Vale la pena revisar contexto, actividad física y dosis.",
      tone: "danger",
      value: String(metrics.hypoglycemiaCount)
    });
  }

  if (metrics.averageCarbs !== null) {
    patterns.push({
      title: "Carga de carbohidratos registrada",
      detail: "El promedio de carbohidratos cargados ayuda a relacionar alimentación, insulina y respuesta glucémica.",
      tone: "info",
      value: `${metrics.averageCarbs} g`
    });
  }

  return patterns.slice(0, 6);
}

function buildRecommendations(metrics: WeeklyInsightMetricSet, patterns: WeeklyInsightPattern[]): WeeklyInsightRecommendation[] {
  if (!metrics.totalRecords) {
    return [
      {
        title: "Crear una base de lectura",
        detail: "Cargá glucemia en al menos 4 o 5 días de la semana y tratá de repetir momentos similares para comparar mejor."
      },
      {
        title: "Sumar contexto",
        detail: "Cuando puedas, agregá carbohidratos e insulina junto a la glucemia: eso permite interpretar causa y respuesta."
      }
    ];
  }

  const recommendations: WeeklyInsightRecommendation[] = [
    {
      title: "Llevar este resumen a la consulta",
      detail: "Comentá el promedio, el tiempo en rango y el momento más sensible para decidir si conviene ajustar hábitos o tratamiento."
    }
  ];

  if (metrics.hyperglycemiaCount > 0) {
    recommendations.push({
      title: "Revisar picos altos",
      detail: "Preguntá si los valores altos se relacionan con comidas específicas, horarios de medicación o conteo de carbohidratos."
    });
  }

  if (metrics.hypoglycemiaCount > 0) {
    recommendations.push({
      title: "Priorizar seguridad ante bajos",
      detail: "Conversá con tu médico qué hacer ante hipoglucemias y si hay que ajustar dosis, colaciones o actividad física."
    });
  }

  if (metrics.daysWithRecords < 5) {
    recommendations.push({
      title: "Mejorar regularidad",
      detail: "Intentá sostener registros en más días para que la próxima lectura semanal sea más confiable."
    });
  }

  if (patterns.some((pattern) => pattern.title === "Variabilidad glucémica" && pattern.tone === "warning")) {
    recommendations.push({
      title: "Buscar qué explica los saltos",
      detail: "Compará horarios, comidas, dosis y actividad física de los días con más diferencia entre valores."
    });
  }

  return recommendations.slice(0, 4);
}

function buildDailyData(period: WeekPeriod, records: ClinicalRecord[]): WeeklyInsightDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(period.startDate);
    date.setDate(period.startDate.getDate() + index);
    const dayRecords = records.filter((record) => isSameDay(new Date(record.fecha_hora), date));
    const values = dayRecords.map((record) => Number(record.glucemia_mgdl)).filter(Number.isFinite);

    return {
      date: toDateKey(date),
      label: date.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit" }).replace(".", ""),
      average: average(values),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      count: values.length
    };
  });
}

function getMomentInsights(records: ClinicalRecord[]) {
  const groups = new Map<string, number[]>();

  records.forEach((record) => {
    const value = Number(record.glucemia_mgdl);
    if (!Number.isFinite(value)) return;
    const label = record.momento?.trim() || "Sin momento";
    groups.set(label, [...(groups.get(label) ?? []), value]);
  });

  const moments = Array.from(groups.entries())
    .map(([label, values]) => ({ label, average: average(values) ?? 0, count: values.length }))
    .filter((moment) => moment.count > 0)
    .toSorted((left, right) => right.average - left.average);

  return {
    highest: moments[0] ?? null,
    lowest: moments.at(-1) ?? null
  };
}

function getAttentionLevel(metrics: WeeklyInsightMetricSet): AttentionLevel {
  if (!metrics.totalRecords) return "sin_datos";
  if (metrics.hypoglycemiaCount > 0 || metrics.hyperglycemiaCount >= 3 || (metrics.timeInRange !== null && metrics.timeInRange < 55)) {
    return "prioritario";
  }
  if (metrics.daysWithRecords < 5 || (metrics.timeInRange !== null && metrics.timeInRange < 75) || (metrics.variability !== null && metrics.variability > 35)) {
    return "observacion";
  }
  return "estable";
}

function getCurrentWeekPeriod(): WeekPeriod {
  const today = startOfDay(new Date());
  const mondayOffset = (today.getDay() + 6) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - mondayOffset);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return {
    weekStart: toDateKey(startDate),
    weekEnd: toDateKey(endDate),
    startDate,
    endDate
  };
}

function countDaysWithRecords(records: ClinicalRecord[]) {
  return new Set(records.map((record) => toDateKey(new Date(record.fecha_hora)))).size;
}

function average(values: number[]) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null;
}

function getStandardDeviation(values: number[]) {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 2) return valid.length ? 0 : null;
  const avg = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const variance = valid.reduce((sum, value) => sum + (value - avg) ** 2, 0) / valid.length;
  return Math.round(Math.sqrt(variance));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(left: Date, right: Date) {
  return toDateKey(left) === toDateKey(right);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toSupabaseTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
