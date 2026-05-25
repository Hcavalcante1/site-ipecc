import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export default function AdminBannersPage() {
  return (
    <AdminPlaceholderPage
      title="Banners"
      description="Espaco reservado para banners e chamadas visuais do site."
      items={["Hero", "Chamadas", "Campanhas"]}
    />
  );
}
