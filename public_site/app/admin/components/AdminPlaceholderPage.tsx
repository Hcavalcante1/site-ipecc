type AdminPlaceholderPageProps = {
  title: string;
  description: string;
};

export default function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <div className="admin-box">
      <h1 className="admin-h1">{title}</h1>
      <p className="admin-subtitle">{description}</p>
      <div className="admin-card">
        <h3>Modulo em preparacao</h3>
        <p>
          Esta area esta reservada no CMS local/staging. Configure o modelo de
          dados e as politicas revisadas antes de habilitar operacoes de
          producao.
        </p>
      </div>
    </div>
  );
}
