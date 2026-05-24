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
  framed?: boolean;
  showHeading?: boolean;
};

export function DataList({ eyebrow, title, emptyMessage, items, framed = true, showHeading = true }: DataPageProps) {
  const content = (
    <>
      {showHeading ? (
        <div className="section-heading">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
        </div>
      ) : null}

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
    </>
  );

  if (!framed) {
    return <div className="embedded-data-list">{content}</div>;
  }

  return (
    <section className="dashboard-card profile-card">
      {content}
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
