import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export default function AdminNoticiasPage() {
  return (
    <AdminPlaceholderPage
      title="Noticias"
      description="Espaco reservado para curadoria de noticias institucionais."
      items={["Listagem", "Publicacao", "Destaques"]}
    />
  );
}
