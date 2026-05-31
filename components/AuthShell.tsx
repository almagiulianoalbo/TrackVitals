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
        <div className="brand-hero-content">
          <div className="brand-lockup">
            <Image className="brand-logo brand-logo-image" src="/logo-trackvitals-hero.png" alt="Logo de TrackVitals" width={1024} height={1024} priority />
            <div>
              <p className="eyebrow">Tu salud. En datos. En control.</p>
              <h1 aria-label="TrackVitals"><span>Track</span><span>Vitals</span></h1>
              <p>Built for diabetics</p>
            </div>
            <div className="hero-actions" aria-label="Acciones de acceso">
              <a className="hero-button hero-button-primary" href="/login#acceso">Ingresá</a>
              <a className="hero-button hero-button-secondary" href="/register#acceso">Registrate</a>
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
        </div>

        <a className="scroll-prompt" href="#preview">
          <span>Deslizá para explorar</span>
          <ScrollArrowIcon />
        </a>
      </section>

      <div className="landing-transition" id="transicion" aria-hidden="true">
        <span className="transition-glow transition-glow-one" />
        <span className="transition-glow transition-glow-two" />
        <span className="transition-ribbon transition-ribbon-one" />
        <span className="transition-ribbon transition-ribbon-two" />
        <svg className="transition-wave transition-wave-bottom" viewBox="0 0 1440 190" preserveAspectRatio="none">
          <path d="M0 112c250-90 480 42 738-16 273-62 476-89 702-29v123H0Z" />
        </svg>
      </div>

      <section className="preview-section" id="preview" aria-labelledby="preview-title">
        <div className="preview-shell">
          <header className="preview-heading">
            <p className="eyebrow">Todo en un mismo lugar</p>
            <h2 id="preview-title">Entendé tu evolución.<br /><span>Compartila con quien te cuida.</span></h2>
            <p>TrackVitals ordena la información importante de cada día para que pacientes y médicos puedan ver más claro y actuar a tiempo.</p>
          </header>

          <div className="preview-dashboard" aria-label="Vista previa de TrackVitals">
            <article className="preview-card preview-chart-card">
              <div className="preview-card-heading">
                <div>
                  <p className="preview-card-label">Evolución glucémica</p>
                  <h3>Tu semana de un vistazo</h3>
                </div>
                <span className="preview-period">Últimos 7 días</span>
              </div>

              <div className="preview-metrics">
                <div>
                  <span>Promedio</span>
                  <strong>112 <small>mg/dL</small></strong>
                </div>
                <div>
                  <span>En rango</span>
                  <strong>86<small>%</small></strong>
                </div>
                <div>
                  <span>Registros</span>
                  <strong>24</strong>
                </div>
              </div>

              <div className="preview-chart-wrap">
                <span className="chart-range-label chart-range-high">180</span>
                <span className="chart-range-label chart-range-low">70</span>
                <svg className="preview-chart" viewBox="0 0 760 238" aria-label="Gráfico ilustrativo de evolución glucémica" role="img">
                  <defs>
                    <linearGradient id="glucose-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity=".26" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path className="chart-range" d="M0 46H760M0 174H760" />
                  <path className="chart-area" d="M0 165C54 160 75 132 118 139C165 146 178 96 226 108C273 119 304 145 346 123C395 97 420 54 466 78C511 102 539 128 578 111C625 90 671 102 760 56V238H0Z" />
                  <path className="chart-line" d="M0 165C54 160 75 132 118 139C165 146 178 96 226 108C273 119 304 145 346 123C395 97 420 54 466 78C511 102 539 128 578 111C625 90 671 102 760 56" />
                  <g className="chart-points">
                    <circle cx="118" cy="139" r="5" />
                    <circle cx="226" cy="108" r="5" />
                    <circle cx="346" cy="123" r="5" />
                    <circle cx="466" cy="78" r="5" />
                    <circle cx="578" cy="111" r="5" />
                    <circle cx="760" cy="56" r="5" />
                  </g>
                </svg>
              </div>

              <div className="preview-chart-days" aria-hidden="true">
                <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
              </div>
            </article>

            <div className="preview-side-stack">
              <article className="preview-card preview-alert-card">
                <span className="preview-card-icon preview-card-icon-alert" aria-hidden="true">
                  <AlertIcon />
                </span>
                <div>
                  <p className="preview-card-label">Alertas inteligentes</p>
                  <h3>Detectá cambios a tiempo</h3>
                  <p>Los valores fuera de rango quedan visibles para facilitar el seguimiento.</p>
                </div>
                <span className="preview-status">Prioridad alta</span>
              </article>

              <article className="preview-card preview-connection-card">
                <span className="preview-card-icon" aria-hidden="true">
                  <MessageIcon />
                </span>
                <div>
                  <p className="preview-card-label">Acompañamiento</p>
                  <h3>Tu médico, más cerca</h3>
                  <p>Mensajes, próximos turnos e indicaciones reunidos en un solo espacio.</p>
                </div>
                <div className="preview-doctor">
                  <span>MC</span>
                  <div>
                    <strong>Dra. María Costa</strong>
                    <small>Diabetología</small>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="preview-feature-row">
            <article className="preview-card preview-feature-card">
              <span className="preview-card-icon" aria-hidden="true"><FoodIcon /></span>
              <div>
                <h3>Plan alimentario</h3>
                <p>Organizá comidas, carbohidratos y objetivos nutricionales.</p>
              </div>
            </article>
            <article className="preview-card preview-feature-card">
              <span className="preview-card-icon" aria-hidden="true"><MedicationIcon /></span>
              <div>
                <h3>Medicación clara</h3>
                <p>Consultá dosis, horarios e indicaciones siempre actualizadas.</p>
              </div>
            </article>
            <article className="preview-card preview-feature-card">
              <span className="preview-card-icon" aria-hidden="true"><CalendarIcon /></span>
              <div>
                <h3>Turnos y controles</h3>
                <p>Mantené el seguimiento ordenado y sin información dispersa.</p>
              </div>
            </article>
          </div>

        </div>
      </section>

      <footer className="landing-footer">
        <span>Powered by <strong>CAF</strong></span>
        <span>TrackVitals 2026</span>
        <span>Ciencia de datos para la Medicina</span>
      </footer>

      <section className="auth-overlay" id="acceso" aria-label="Acceso a TrackVitals">
        <a className="auth-overlay-backdrop" href="#" aria-label="Cerrar acceso" />
        <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <a className="auth-close" href="#" aria-label="Cerrar acceso">
            <CloseIcon />
          </a>
          <div className="auth-panel">
            <div className="mobile-logo">
              <Image src="/logo-trackvitals-real.png" alt="TrackVitals" width={96} height={85} priority />
            </div>
            <div className="auth-heading">
              <p className="eyebrow">TrackVitals</p>
              <h2 id="auth-title">{title}</h2>
              <p>{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

function ScrollArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
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

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 4a6 6 0 0 0-6 6c0 7-3 7-3 9h18c0-2-3-2-3-9a6 6 0 0 0-6-6Z" />
      <path d="M10 22h4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3c3 3 3 8 0 11v7M16 3v11h4" />
    </svg>
  );
}

function MedicationIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m7 17 10-10a4 4 0 0 0-6-6L1 11a4 4 0 0 0 6 6Zm0-10 6 6" />
      <path d="M14 19h7M17.5 15.5v7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v4M17 2v4M3 9h18" />
      <path d="m8 14 2 2 5-5" />
    </svg>
  );
}
