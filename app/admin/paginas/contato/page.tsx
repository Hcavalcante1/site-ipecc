import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function ContatoAdminIndex() {
  const r = adminCanonicalRoutes.contato;

  return (
    <AdminPaginasHubLayout
      titulo="Página — Contato"
      subtitulo={
        <>
          Edite os blocos exibidos na página pública <strong>Contato</strong>.
          Use esta área para manter canais oficiais, endereço e orientações de
          atendimento atualizados.
        </>
      }
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero da página"
          descricao="Título e texto principal do topo da página pública /contato."
          href={r.hero}
        />
        <AdminHubCard
          titulo="Canais oficiais"
          descricao="E-mails, telefones e canais exibidos nos cards de contato."
          href={r.canais}
        />
        <AdminHubCard
          titulo="Endereço e mapa"
          descricao="Endereço físico e mapa exibidos na página /contato."
          href={r.endereco}
        />
        <AdminHubCard
          titulo="Formulário"
          descricao="Texto de orientação exibido acima do formulário público."
          href={r.formulario}
        />
        <AdminHubCard
          titulo="CTA Final"
          descricao="Chamada final da página /contato, com texto e ação."
          href={r.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
