type AdminPlaceholderPageProps = {
  title: string;
  description: string;
  items: string[];
};

export default function AdminPlaceholderPage({
  title,
  description,
  items,
}: AdminPlaceholderPageProps) {
  return (
    <section className="admin-box">
      <h1 className="admin-h1">{title}</h1>
      <p className="admin-subtitle">{description}</p>

      <div className="admin-grid" aria-label="Proximos controles previstos">
        {items.map((item) => (
          <article className="admin-card" key={item}>
            <h3>{item}</h3>
            <p className="admin-subtitle">
              Modulo preparado para configuracao local antes de integrar ao CMS.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
