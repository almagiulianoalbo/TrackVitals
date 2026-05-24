import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { getCurrentSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type VitalRecord = {
  [key: string]: unknown;
};

const RECORDS_TABLE = "registros_diarios";
const RECORD_ID_COLUMNS = ["id_registro"];
const DATE_COLUMNS = ["fecha_hora"];
const RECORD_COLUMNS =
  "id_registro,id_paciente,fecha_hora,momento,glucemia_mgdl,carbohidratos_g,tipo_insulina,dosis_unidades";

export default async function RecordsPage() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  const records = await getRecords(user);

  return (
    <DashboardShell
      user={user}
      activeItem="registros"
      subtitle="Historial de controles y mediciones."
    >
      <section className="dashboard-card profile-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mis registros</p>
            <h2>Registros cargados</h2>
          </div>
        </div>

        {records.length ? (
          <div className="record-list" aria-label="Lista de registros">
            {records.map((record, index) => (
              <Link
                className="record-list-item"
                href={getRecordHref(record)}
                key={getRecordKey(record, index)}
              >
                <span>{formatDate(getRecordDateValue(record))}</span>
                <strong>Ver</strong>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">Todavía no hay registros cargados.</p>
        )}
      </section>
    </DashboardShell>
  );
}

async function getRecords(user: SessionUser) {
  if (user.role !== "paciente") {
    return [];
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from(RECORDS_TABLE)
      .select(RECORD_COLUMNS)
      .eq("id_paciente", user.userId)
      .order("fecha_hora", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return sortRecords((data ?? []) as VitalRecord[]);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function sortRecords(records: VitalRecord[]) {
  return [...records].sort(
    (left, right) => getRecordTime(right) - getRecordTime(left),
  );
}

function getRecordTime(record: VitalRecord) {
  const value = getRecordDateValue(record);
  const date = parseRecordDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getRecordDateValue(record: VitalRecord) {
  return DATE_COLUMNS.map((column) => record[column]).find(Boolean);
}

function getRecordHref(record: VitalRecord) {
  const id = getRecordId(record);
  const encodedRecord = Buffer.from(JSON.stringify(record)).toString("base64");
  const recordParam = `record=${encodeURIComponent(encodedRecord)}`;

  if (id) {
    return `/dashboard/mis-registros/view?id=${encodeURIComponent(id)}&${recordParam}`;
  }

  return `/dashboard/mis-registros/view?${recordParam}`;
}

function getRecordId(record: VitalRecord) {
  for (const column of RECORD_ID_COLUMNS) {
    const value = record[column];

    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }

  return null;
}

function getRecordKey(record: VitalRecord, index: number) {
  return (
    getRecordId(record) ??
    `${String(getRecordDateValue(record) ?? "registro")}-${index}`
  );
}

function formatDate(value: unknown) {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = parseRecordDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  if (isDateOnly(value)) {
    return date.toLocaleDateString("es-AR", { dateStyle: "medium" });
  }

  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseRecordDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (isDateOnly(value)) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(String(value));
}

function isDateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
