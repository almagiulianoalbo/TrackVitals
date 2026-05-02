import Image from "next/image";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="brand-panel" aria-label="TrackVitals">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/logo.png" alt="TrackVitals" width={210} height={164} priority />
          <div>
            <p className="eyebrow">Diabetes care</p>
            <h1>TrackVitals</h1>
            <p>Seguimiento clinico para pacientes y medicos.</p>
          </div>
        </div>

        <div className="vitals-strip" aria-label="Indicadores clinicos">
          <div>
            <span>Glucosa</span>
            <strong>95</strong>
          </div>
          <div>
            <span>HbA1c</span>
            <strong>6.4%</strong>
          </div>
          <div>
            <span>Control</span>
            <strong>OK</strong>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="mobile-logo">
          <Image src="/logo.png" alt="TrackVitals" width={128} height={100} priority />
        </div>
        <div className="auth-heading">
          <p className="eyebrow">TrackVitals</p>
          <h2 id="auth-title">{title}</h2>
          <p>{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
