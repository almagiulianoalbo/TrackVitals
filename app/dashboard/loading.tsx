export default function DashboardLoading() {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar loading-panel" aria-hidden="true">
        <div className="loading-brand">
          <span className="loading-avatar" />
          <div>
            <span className="loading-line short" />
            <span className="loading-line tiny" />
          </div>
        </div>
        <div className="loading-nav">
          {Array.from({ length: 7 }).map((_, index) => (
            <span className="loading-line" key={index} />
          ))}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar loading-panel" aria-live="polite">
          <div className="dashboard-title">
            <p className="eyebrow">Cargando</p>
            <h1>Preparando tus datos</h1>
            <p>Estamos actualizando la vista.</p>
          </div>
        </header>

        <section className="dashboard-content" aria-hidden="true">
          <div className="loading-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="metric-card loading-panel" key={index}>
                <span className="loading-line short" />
                <span className="loading-line large" />
                <span className="loading-line" />
              </article>
            ))}
          </div>

          <article className="dashboard-card loading-panel">
            <span className="loading-line short" />
            <span className="loading-line large" />
            <div className="loading-list">
              {Array.from({ length: 5 }).map((_, index) => (
                <span className="loading-line" key={index} />
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
