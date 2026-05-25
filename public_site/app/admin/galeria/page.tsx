import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export default function AdminGaleriaPage() {
  return (
    <AdminPlaceholderPage
      title="Galeria"
      description="Espaco reservado para organizacao de imagens e albuns."
      items={["Albuns", "Imagens", "Publicacao"]}
    />
  );
}
