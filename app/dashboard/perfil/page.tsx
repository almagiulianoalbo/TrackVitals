import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardChrome";
import { ProfilePhotoUploader } from "@/components/ProfilePhotoUploader";
import { getCurrentSession } from "@/lib/auth";
import { roleLabels, type SessionUser } from "@/lib/auth-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PatientProfile = {
  foto_url: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  dni: string | null;
  telefono: string | null;
  tipo_diabetes: string | null;
  id_medico_cabecera: number | null;
};

type DoctorProfile = {
  foto_url: string | null;
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
        <ProfilePhotoUploader
          currentUrl={profile.patient?.foto_url ?? profile.doctor?.foto_url ?? null}
          name={user.name}
          roleLabel={roleLabels[user.role]}
        />

        <ProfileInfoCard
          eyebrow="Cuenta"
          title="Identidad digital"
          lead={user.email}
          badge={roleLabels[user.role]}
          items={[
            ["Nombre", user.name],
            ["Tipo de usuario", roleLabels[user.role]],
            ["ID", `#${user.userId}`]
          ]}
        />

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
    <article className="dashboard-card profile-card profile-detail-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Información clínica</p>
          <h2>Resumen médico</h2>
        </div>
      </div>

      <div className="profile-feature">
        <span>Tipo de diabetes</span>
        <strong>{formatDiabetes(profile?.tipo_diabetes)}</strong>
        <em>{profile?.id_medico_cabecera ? `Médico #${profile.id_medico_cabecera}` : "Sin médico asignado"}</em>
      </div>

      <dl className="profile-info-grid">
        <InfoTile label="Edad" value={formatAge(profile?.fecha_nacimiento)} />
        <InfoTile label="Sexo" value={formatSex(profile?.sexo)} />
        <InfoTile label="DNI" value={profile?.dni || "No cargado"} />
        <InfoTile label="Teléfono" value={profile?.telefono || "No cargado"} />
      </dl>
    </article>
  );
}

function DoctorProfileCard({ profile }: { profile: DoctorProfile | null }) {
  return (
    <article className="dashboard-card profile-card profile-detail-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Información profesional</p>
          <h2>Credenciales</h2>
        </div>
      </div>

      <div className="profile-feature">
        <span>Matrícula</span>
        <strong>{profile?.matricula || "No cargada"}</strong>
        <em>Perfil profesional activo</em>
      </div>

      <dl className="profile-info-grid">
        <InfoTile label="Rol" value="Médico tratante" />
        <InfoTile label="Estado" value="Disponible para seguimiento" />
      </dl>
    </article>
  );
}

function ProfileInfoCard({
  eyebrow,
  title,
  lead,
  badge,
  items
}: {
  eyebrow: string;
  title: string;
  lead: string;
  badge: string;
  items: [string, string][];
}) {
  return (
    <article className="dashboard-card profile-card profile-detail-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="profile-status-pill">{badge}</span>
      </div>

      <div className="profile-feature compact">
        <span>Email</span>
        <strong>{lead}</strong>
      </div>

      <dl className="profile-info-grid">
        {items.map(([label, value]) => (
          <InfoTile label={label} value={value} key={label} />
        ))}
      </dl>
    </article>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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
        .select("foto_url,fecha_nacimiento,sexo,dni,telefono,tipo_diabetes,id_medico_cabecera")
        .eq("id_paciente", user.userId)
        .maybeSingle();

      return {
        ...fallback,
        patient: (data as PatientProfile | null) ?? null
      };
    }

    const { data } = await supabase.from("medicos").select("foto_url,matricula").eq("id_medico", user.userId).maybeSingle();

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
