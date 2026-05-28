import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { PatientRecordsExplorer, type PatientRecordRow } from "@/components/PatientRecordsExplorer";
import { getCurrentSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RECORDS_TABLE = "registros_diarios";
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
      <PatientRecordsExplorer records={records} />
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

    return ((data ?? []) as PatientRecordRow[]).toSorted(
      (left, right) => new Date(right.fecha_hora).getTime() - new Date(left.fecha_hora).getTime(),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}
