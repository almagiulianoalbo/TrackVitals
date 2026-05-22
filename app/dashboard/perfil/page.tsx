import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { getCurrentSession } from "@/lib/auth";
import { roleLabels, type SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PatientProfile = {
  fecha_nacimiento: string | null;
  sexo: string | null;
  dni: string | null;
  telefono: string | null;
  tipo_diabetes: string | null;
  id_medico_cabecera: number | null;
};

type DoctorProfile = {
  matricula: string | null;
};

export default async function ProfilePage() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user);

  return (
    <DashboardShell user={user} activeItem="perfil" subtitle="Datos de cuenta y perfil clínico.">
      <section className="profile-grid" aria-label="Perfil">
        <article className="dashboard-card profile-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Perfil</p>
              <h2>Datos principales</h2>
            </div>
          </div>

          <dl className="account-list">
            <div>
              <dt>Nombre</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Tipo de usuario</dt>
              <dd>{roleLabels[user.role]}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>{user.userId}</dd>
            </div>
          </dl>
        </article>

        {user.role === "paciente" ? (
          <PatientProfileCard profile={profile.patient} />
        ) : (
          <DoctorProfileCard profile={profile.doctor} />
        )}
      </section>
    </DashboardShell>
  );
}

function PatientProfileCard({ profile }: { profile: PatientProfile | null }) {
  return (
    <article className="dashboard-card profile-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Información clínica</p>
          <h2>Datos médicos</h2>
        </div>
      </div>

      <dl className="account-list">
        <div>
          <dt>Tipo de diabetes</dt>
          <dd>{formatDiabetes(profile?.tipo_diabetes)}</dd>
        </div>
        <div>
          <dt>Médico cabecera</dt>
          <dd>{profile?.id_medico_cabecera ? `#${profile.id_medico_cabecera}` : "No asignado"}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{profile?.telefono || "No cargado"}</dd>
        </div>
        <div>
          <dt>DNI</dt>
          <dd>{profile?.dni || "No cargado"}</dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{formatAge(profile?.fecha_nacimiento)}</dd>
        </div>
        <div>
          <dt>Sexo</dt>
          <dd>{formatSex(profile?.sexo)}</dd>
        </div>
      </dl>
    </article>
  );
}

function DoctorProfileCard({ profile }: { profile: DoctorProfile | null }) {
  return (
    <article className="dashboard-card profile-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Información profesional</p>
          <h2>Datos médicos</h2>
        </div>
      </div>

      <dl className="account-list">
        <div>
          <dt>Matrícula</dt>
          <dd>{profile?.matricula || "No cargada"}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>Médico tratante</dd>
        </div>
      </dl>

      <p className="profile-note">La edición del perfil va a quedar conectada cuando armemos el formulario de configuración.</p>
    </article>
  );
}

async function getProfile(user: SessionUser) {
  const fallback = {
    patient: null as PatientProfile | null,
    doctor: null as DoctorProfile | null
  };

  try {
    const supabase = getSupabaseAdmin();

    if (user.role === "paciente") {
      const { data } = await supabase
        .from("pacientes")
        .select("fecha_nacimiento,sexo,dni,telefono,tipo_diabetes,id_medico_cabecera")
        .eq("id_paciente", user.userId)
        .maybeSingle();

      return {
        ...fallback,
        patient: (data as PatientProfile | null) ?? null
      };
    }

    const { data } = await supabase.from("medicos").select("matricula").eq("id_medico", user.userId).maybeSingle();

    return {
      ...fallback,
      doctor: (data as DoctorProfile | null) ?? null
    };
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function formatAge(date: string | null | undefined) {
  if (!date) {
    return "Edad pendiente";
  }

  const birthDate = new Date(date);

  if (Number.isNaN(birthDate.getTime())) {
    return "Edad pendiente";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} años`;
}

function formatDiabetes(value: string | null | undefined) {
  const labels: Record<string, string> = {
    tipo_1: "Diabetes tipo 1",
    tipo_2: "Diabetes tipo 2",
    gestacional: "Diabetes gestacional",
    otro: "Otro tipo"
  };

  return value ? labels[value] ?? value : "No especificado";
}

function formatSex(value: string | null | undefined) {
  const labels: Record<string, string> = {
    F: "Femenino",
    M: "Masculino",
    X: "Otro"
  };

  return value ? labels[value] ?? value : "No especificado";
}
