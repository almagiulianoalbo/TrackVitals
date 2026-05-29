import { formatValue } from "@/lib/dashboard-format";

export type ListItem = {
  id: number | string;
  title: string;
  meta?: string;
  details: { label: string; value: string | number | null | undefined }[];
};

export function DataList({
  eyebrow,
  title,
  emptyMessage,
  items
}: {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  items: ListItem[];
}) {
  return (
    <section className="dashboard-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>

      {items.length ? (
        <div className="data-list">
          {items.map((item) => (
            <article className="data-list-item" key={item.id}>
              <div className="data-list-heading">
                <div>
                  <h3>{item.title}</h3>
                  {item.meta ? <p>{item.meta}</p> : null}
                </div>
              </div>
              <dl className="data-detail-list">
                {item.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{formatValue(detail.value)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">{emptyMessage}</p>
      )}
    </section>
  );
}

export function unauthorizedList(section: string) {
  return (
    <section className="dashboard-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Acceso restringido</p>
          <h2>No disponible</h2>
        </div>
      </div>
      <p className="empty-state">Esta sección no está disponible para tu tipo de usuario: {section}.</p>
    </section>
  );
}
