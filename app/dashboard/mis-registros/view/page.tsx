import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SessionUser } from "@/lib/auth-types";

type VitalRecord = {
  [key: string]: unknown;
};

type RecordViewPageProps = {
  searchParams: Promise<{
    record?: string | string[];
    id?: string | string[];
  }>;
};

const RECORDS_TABLE = "registros_diarios";
const DATE_COLUMNS = ["fecha_hora"];
const RECORD_COLUMNS =
  "id_registro,id_paciente,fecha_hora,momento,glucemia_mgdl,carbohidratos_g,tipo_insulina,dosis_unidades";

export default async function RecordViewPage({ searchParams }: RecordViewPageProps) {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const params = await searchParams;
  const recordParam = getFirstParam(params.record);
  const idParam = getFirstParam(params.id);
  let record: VitalRecord | null = null;

  if (idParam) {
    record = await fetchRecordById(idParam, user);
  }

  if (!record && recordParam) {
    record = decodeRecordParam(recordParam, user);
  }

  return (
    <DashboardShell user={user} activeItem="registros" subtitle="Detalle del registro">
      <section className="dashboard-card profile-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Registro</p>
            <h2>{formatDate(record ? getRecordDateValue(record) : null)}</h2>
          </div>

          <Link href="/dashboard/mis-registros" className="inline-action">
            Volver
          </Link>
        </div>

        {!record ? (
          <p className="empty-state">No se encontró el registro.</p>
        ) : (
          <dl className="account-list">
            {Object.keys(record).map((key) => (
              <div key={key}>
                <dt>{formatKey(key)}</dt>
                <dd>{formatValue(key, record[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </DashboardShell>
  );
}

async function fetchRecordById(id: string, user: SessionUser) {
  if (user.role !== "paciente") {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(RECORDS_TABLE)
      .select(RECORD_COLUMNS)
      .eq("id_registro", id)
      .eq("id_paciente", user.userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return (data as VitalRecord | null) ?? null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decodeRecordParam(recordParam: string, user: SessionUser) {
  try {
    const decoded = Buffer.from(decodeURIComponent(recordParam), "base64").toString("utf8");
    const parsedRecord = JSON.parse(decoded) as VitalRecord;

    if (String(parsedRecord.id_paciente ?? "") !== String(user.userId)) {
      return null;
    }

    return parsedRecord;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function getRecordDateValue(record: VitalRecord) {
  return DATE_COLUMNS.map((column) => record[column]).find(Boolean);
}

function formatDate(value: unknown) {
  if (!value) return "Fecha no disponible";
  const d = parseRecordDate(value);
  if (Number.isNaN(d.getTime())) return "Fecha no disponible";

  if (isDateOnly(value)) {
    return d.toLocaleDateString("es-AR", { dateStyle: "medium" });
  }

  return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

function parseRecordDate(value: unknown) {
  if (isDateOnly(value)) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(String(value));
}

function isDateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (isDateKey(key)) {
    return formatDate(value);
  }

  if (key === "glucemia_mgdl") {
    return `${String(value)} mg/dL`;
  }

  if (key === "carbohidratos_g") {
    return `${String(value)} g`;
  }

  if (key === "dosis_unidades") {
    return `${String(value)} unidades`;
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function isDateKey(key: string) {
  const normalizedKey = key.toLowerCase();
  return normalizedKey.includes("fecha") || normalizedKey.endsWith("_at") || normalizedKey.endsWith("at");
}

function formatKey(key: string) {
  const labels: Record<string, string> = {
    id: "ID",
    id_registro: "ID del registro",
    registro_id: "ID del registro",
    uuid: "UUID",
    id_paciente: "ID del paciente",
    fecha_hora: "Fecha y hora",
    fecha: "Fecha",
    fecha_registro: "Fecha del registro",
    created_at: "Fecha de creación",
    createdAt: "Fecha de creación",
    updated_at: "Última actualización",
    momento: "Momento",
    glucemia_mgdl: "Glucemia",
    carbohidratos_g: "Carbohidratos",
    tipo_insulina: "Tipo de insulina",
    dosis_unidades: "Dosis"
  };

  return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
