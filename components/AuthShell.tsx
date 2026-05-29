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
          <Image className="brand-logo" src="/logo-trackvitals-real.png" alt="TrackVitals" width={170} height={150} priority />
          <div>
            <p className="eyebrow">Tu salud. En datos. En control.</p>
            <h1><span>Track</span><span>Vitals</span></h1>
            <p>Built for diabetics</p>
          </div>
        </div>

        <div className="brand-feature-list" aria-label="Beneficios de TrackVitals">
          <div>
            <span className="brand-feature-icon" aria-hidden="true">
              <TrendIcon />
            </span>
            <strong>Seguimiento en tiempo real</strong>
          </div>
          <div>
            <span className="brand-feature-icon" aria-hidden="true">
              <ShieldIcon />
            </span>
            <strong>Información que te empodera</strong>
          </div>
          <div>
            <span className="brand-feature-icon" aria-hidden="true">
              <TeamIcon />
            </span>
            <strong>Conectá con tu médico</strong>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="mobile-logo">
          <Image src="/logo-trackvitals-real.png" alt="TrackVitals" width={96} height={85} priority />
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

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 18V6" />
      <path d="M4 18h16" />
      <path d="m7 15 4-4 3 3 5-7" />
      <path d="M15 7h4v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M3 20c.7-3.4 2.5-5 5-5s4.3 1.6 5 5" />
      <path d="M11 20c.6-2.7 2.2-4.2 5-4.2 2.6 0 4.3 1.5 5 4.2" />
    </svg>
  );
}
