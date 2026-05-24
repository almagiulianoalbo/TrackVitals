import type { DashboardNavKey } from "@/components/DashboardChrome";
import type React from "react";

export type DetailItem = {
  label: string;
  value: React.ReactNode;
};

export type ListItem = {
  id: string | number;
  title: string;
  meta?: string;
  details: DetailItem[];
};

type DataPageProps = {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  items: ListItem[];
};

export function DataList({ eyebrow, title, emptyMessage, items }: DataPageProps) {
  return (
    <section className="dashboard-card profile-card">
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
                    <dd>{detail.value}</dd>
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

export function unauthorizedList(activeItem: DashboardNavKey) {
  return (
    <DataList
      eyebrow="Sin acceso"
      title="Vista no disponible"
      emptyMessage={`Tu usuario no tiene acceso a esta sección (${activeItem}).`}
      items={[]}
    />
  );
}
