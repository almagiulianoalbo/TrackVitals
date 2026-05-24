import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { DataList, type ListItem, unauthorizedList } from "@/components/dashboard/DataViews";
import { getCurrentSession } from "@/lib/auth";
import { formatDate, formatValue } from "@/lib/dashboard-format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PatientRow = {
  id_paciente: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_diabetes: string | null;
};

export default async function MyPatientsPage() {
  const user = await getCurrentSession();
  if (!user) redirect("/login");

  if (user.role !== "medico") {
    return (
      <DashboardShell user={user} activeItem="pacientes" subtitle="Pacientes asignados.">
        {unauthorizedList("pacientes")}
      </DashboardShell>
    );
  }

  const patients = await getPatients(user.userId);

  return (
    <DashboardShell user={user} activeItem="pacientes" subtitle="Pacientes asignados a tu matrícula.">
      <DataList
        eyebrow="Mis pacientes"
        title="Pacientes asignados"
        emptyMessage="Todavía no hay pacientes vinculados."
        items={patients.map(toListItem)}
      />
    </DashboardShell>
  );
}

async function getPatients(doctorId: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("pacientes")
      .select("id_paciente,nombre,apellido,email,telefono,fecha_nacimiento,tipo_diabetes")
      .eq("id_medico_cabecera", doctorId)
      .order("apellido", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as PatientRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function toListItem(patient: PatientRow): ListItem {
  const name = [patient.nombre, patient.apellido].filter(Boolean).join(" ") || `Paciente #${patient.id_paciente}`;

  return {
    id: patient.id_paciente,
    title: name,
    meta: patient.email ?? "Email no cargado",
    details: [
      { label: "ID paciente", value: patient.id_paciente },
      { label: "Teléfono", value: formatValue(patient.telefono) },
      { label: "Fecha de nacimiento", value: formatDate(patient.fecha_nacimiento) },
      { label: "Tipo de diabetes", value: formatValue(patient.tipo_diabetes, "No especificado") }
    ]
  };
}
