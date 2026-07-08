import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { getCurrentSession } from "@/lib/auth";
import { getOrCreateWeeklyInsight, type WeeklyInsightDocument } from "@/lib/weekly-insights";

export default async function WeeklyInsightPage() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "paciente") {
    redirect("/dashboard");
  }

  try {
    const insight = await getOrCreateWeeklyInsight(user.userId);

    return (
      <DashboardShell user={user} activeItem="panel" subtitle="Lectura inteligente de tus registros clínicos.">
        <WeeklyInsightView insight={insight} />
      </DashboardShell>
    );
  } catch (error) {
    console.error(error);

    return (
      <DashboardShell user={user} activeItem="panel" subtitle="Lectura inteligente de tus registros clínicos.">
        <section className="weekly-insight-page">
          <article className="weekly-insight-setup">
            <p className="eyebrow">Insight semanal</p>
            <h2>No se pudo cargar MongoDB</h2>
            <p>
              La funcionalidad ya está preparada, pero falta configurar `MONGODB_URI` en el entorno para guardar y leer la colección `weekly_insights`.
            </p>
            <Link className="inline-action" href="/dashboard">
              Volver al panel
            </Link>
          </article>
        </section>
      </DashboardShell>
    );
  }
}

function WeeklyInsightView({ insight }: { insight: WeeklyInsightDocument }) {
  const generatedAt = new Date(insight.generatedAt);

  return (
    <section className="weekly-insight-page">
      <div className={`insight-hero-panel ${insight.attentionLevel}`}>
        <div className="insight-hero-copy">
          <Link className="insight-back-link" href="/dashboard">
            Volver al panel
          </Link>
          <p className="eyebrow">Insight semanal</p>
          <h2>Tu semana clínica, interpretada.</h2>
          <p>{insight.summary}</p>
          <div className="insight-period-row">
            <span>{formatDate(insight.weekStart)} - {formatDate(insight.weekEnd)}</span>
            <span>Generado {formatDateTime(generatedAt)}</span>
          </div>
        </div>

        <aside className="insight-attention-card">
          <span>Nivel de atención</span>
          <strong>{formatAttention(insight.attentionLevel)}</strong>
          <p>{getAttentionCaption(insight.attentionLevel)}</p>
        </aside>
      </div>

      <div className="insight-metric-grid">
        <InsightMetric label="Tiempo en rango" value={formatPercent(insight.metrics.timeInRange)} detail="Objetivo 70-180 mg/dL" />
        <InsightMetric label="Promedio" value={formatMetric(insight.metrics.averageGlucose, "mg/dL")} detail={`${insight.metrics.totalRecords} registros`} />
        <InsightMetric label="Variabilidad" value={formatMetric(insight.metrics.variability, "mg/dL")} detail="Dispersión semanal" />
        <InsightMetric label="Cobertura" value={`${insight.metrics.daysWithRecords}/7`} detail="Días con registros" />
      </div>

      <div className="insight-main-grid">
        <article className="insight-panel insight-chart-panel">
          <div className="chart-heading-row">
            <div>
              <p className="eyebrow">Mapa semanal</p>
              <h3>Promedio diario y rango real</h3>
            </div>
            <span>{insight.metrics.totalRecords ? "Datos de Supabase" : "Sin registros"}</span>
          </div>
          <InsightWeekChart insight={insight} />
          <div className="insight-range-strip" aria-label="Distribución por rango">
            <RangeSegment className="low" count={insight.chartData.rangeDistribution.low} total={insight.metrics.totalRecords} label="Bajas" />
            <RangeSegment className="normal" count={insight.chartData.rangeDistribution.inRange} total={insight.metrics.totalRecords} label="En rango" />
            <RangeSegment className="high" count={insight.chartData.rangeDistribution.high} total={insight.metrics.totalRecords} label="Altas" />
          </div>
        </article>

        <article className="insight-panel">
          <p className="eyebrow">Patrones detectados</p>
          <h3>Señales que vale la pena mirar</h3>
          <div className="insight-pattern-list">
            {insight.patterns.map((pattern) => (
              <section className={`insight-pattern ${pattern.tone}`} key={pattern.title}>
                <div>
                  <strong>{pattern.title}</strong>
                  <p>{pattern.detail}</p>
                </div>
                {pattern.value ? <span>{pattern.value}</span> : null}
              </section>
            ))}
          </div>
        </article>

        <article className="insight-panel insight-recommendation-panel">
          <p className="eyebrow">Para conversar con tu médico</p>
          <h3>Recomendaciones accionables</h3>
          <div className="insight-recommendation-list">
            {insight.recommendations.map((recommendation, index) => (
              <section key={recommendation.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{recommendation.title}</strong>
                  <p>{recommendation.detail}</p>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function InsightMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="insight-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

function InsightWeekChart({ insight }: { insight: WeeklyInsightDocument }) {
  const width = 820;
  const height = 260;
  const padding = { top: 26, right: 22, bottom: 34, left: 46 };
  const values = insight.chartData.daily.flatMap((day) => [day.average, day.min, day.max]).filter((value): value is number => typeof value === "number");
  const yMin = Math.max(40, Math.floor((Math.min(...values, 70) - 16) / 10) * 10);
  const yMax = Math.min(320, Math.ceil((Math.max(...values, 180) + 16) / 10) * 10);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xForIndex = (index: number) => padding.left + (index / 6) * chartWidth;
  const yForValue = (value: number) => padding.top + ((yMax - value) * chartHeight) / (yMax - yMin || 1);
  const avgPoints = insight.chartData.daily
    .map((day, index) => (day.average === null ? null : { x: xForIndex(index), y: yForValue(day.average), day }))
    .filter((point): point is { x: number; y: number; day: WeeklyInsightDocument["chartData"]["daily"][number] } => Boolean(point));
  const line = buildSmoothPath(avgPoints);
  const area = buildAreaPath(avgPoints, height - padding.bottom);
  const highLine = yForValue(180);
  const lowLine = yForValue(70);

  if (!avgPoints.length) {
    return <p className="chart-empty">Cargá registros durante la semana para generar el mapa visual del insight.</p>;
  }

  return (
    <div className="insight-week-chart-wrap">
      <svg className="insight-week-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa semanal de glucemia">
        <defs>
          <linearGradient id="insightArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={padding.left} y={highLine} width={chartWidth} height={lowLine - highLine} rx="18" className="insight-target-zone" />
        <path d={`M${padding.left} ${highLine}H${width - padding.right}M${padding.left} ${lowLine}H${width - padding.right}`} className="insight-range-lines" />
        {area ? <path d={area} className="insight-area" /> : null}
        {line ? <path d={line} className="insight-line" /> : null}
        {insight.chartData.daily.map((day, index) => {
          if (day.min === null || day.max === null) return null;
          const x = xForIndex(index);
          return <line x1={x} x2={x} y1={yForValue(day.max)} y2={yForValue(day.min)} className="insight-range-pin" key={`pin-${day.date}`} />;
        })}
        {avgPoints.map((point) => (
          <circle className={getPointClass(point.day.average)} cx={point.x} cy={point.y} r="7" key={point.day.date}>
            <title>{`${point.day.label}: ${point.day.average} mg/dL`}</title>
          </circle>
        ))}
      </svg>
      <div className="insight-week-days" aria-hidden="true">
        {insight.chartData.daily.map((day) => <span key={day.date}>{day.label}</span>)}
      </div>
    </div>
  );
}

function RangeSegment({ className, count, total, label }: { className: string; count: number; total: number; label: string }) {
  const width = total ? Math.max(5, Math.round((count / total) * 100)) : 0;
  return (
    <span className={`insight-range-segment ${className}`} style={{ width: `${width}%` }}>
      {count ? `${label} ${count}` : ""}
    </span>
  );
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildSmoothPath(points)} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
}

function getPointClass(value: number | null) {
  if (value === null) return "insight-point";
  if (value < 70) return "insight-point low";
  if (value > 180) return "insight-point high";
  return "insight-point normal";
}

function formatMetric(value: number | null, unit: string) {
  return value === null ? "--" : `${value} ${unit}`;
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

function formatAttention(value: WeeklyInsightDocument["attentionLevel"]) {
  const labels = {
    estable: "Estable",
    observacion: "En observación",
    prioritario: "Prioritario",
    sin_datos: "Sin datos"
  };
  return labels[value];
}

function getAttentionCaption(value: WeeklyInsightDocument["attentionLevel"]) {
  const captions = {
    estable: "Buena señal general. Sostener el registro ayuda a confirmar la tendencia.",
    observacion: "Hay señales para mirar con calma y llevar a la próxima consulta.",
    prioritario: "Conviene conversar estos datos con el médico para revisar contexto y tratamiento.",
    sin_datos: "Faltan registros para interpretar la semana con seguridad."
  };
  return captions[value];
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function formatDateTime(value: Date) {
  if (Number.isNaN(value.getTime())) return "recién";
  return value.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
