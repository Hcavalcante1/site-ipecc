import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export default function AdminEventosPage() {
  return (
    <AdminPlaceholderPage
      title="Eventos"
      description="Espaco reservado para agenda e gestao de eventos publicos."
      items={["Agenda", "Inscricoes", "Historico"]}
    />
  );
}
