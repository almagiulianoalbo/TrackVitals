import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDate, formatPatientName, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PrescriptionRow = {
  id_prescripcion: number;
  titulo: string | null;
  indicaciones: string | null;
  medicamento: string | null;
  dosis: number | string | null;
  unidad: string | null;
  frecuencia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  pacientes?: { nombre: string | null; apellido: string | null } | { nombre: string | null; apellido: string | null }[] | null;
};

export default async function PrescriptionsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  const prescriptions = await getPrescriptions(user.role, user.userId);

  return (
    <DashboardShell user={user} activeItem="prescripciones" subtitle="Indicaciones médicas y tratamientos.">
      <DataList
        eyebrow="Prescripciones"
        title="Prescripciones cargadas"
        emptyMessage="Todavía no hay prescripciones cargadas."
        items={prescriptions.map(toListItem)}
      />
    </DashboardShell>
  );
}

async function getPrescriptions(role: "paciente" | "medico", userId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const filterColumn = role === "medico" ? "id_medico" : "id_paciente";
    const { data, error } = await supabase
      .from("prescripciones")
      .select("id_prescripcion,titulo,indicaciones,medicamento,dosis,unidad,frecuencia,fecha_inicio,fecha_fin,estado,pacientes(nombre,apellido)")
      .eq(filterColumn, userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as PrescriptionRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(prescription: PrescriptionRow): ListItem {
  const dose = [prescription.dosis, prescription.unidad].filter(Boolean).join(" ");

  return {
    id: prescription.id_prescripcion,
    title: prescription.titulo || prescription.medicamento || `Prescripción #${prescription.id_prescripcion}`,
    meta: formatPatientName(prescription.pacientes),
    details: [
      { label: "Medicamento", value: formatValue(prescription.medicamento) },
      { label: "Dosis", value: dose || "No cargado" },
      { label: "Frecuencia", value: formatValue(prescription.frecuencia) },
      { label: "Inicio", value: formatDate(prescription.fecha_inicio) },
      { label: "Fin", value: formatDate(prescription.fecha_fin) },
      { label: "Estado", value: formatValue(prescription.estado) },
      { label: "Indicaciones", value: formatValue(prescription.indicaciones) }
    ]
  };
}
