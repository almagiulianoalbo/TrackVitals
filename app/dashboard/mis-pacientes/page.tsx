import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { unauthorizedList } from "@/components/dashboard/DataViews";
import { PatientsDirectory, type PatientDirectoryRow } from "@/components/PatientsDirectory";
import { getCurrentSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
      <PatientsDirectory patients={patients} />
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

    return (data ?? []) as PatientDirectoryRow[];
  } catch (error) {
    console.error(error);
    return [];
  }
}
