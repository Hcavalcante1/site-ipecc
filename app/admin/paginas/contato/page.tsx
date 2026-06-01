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
          Escolha qual bloco da página pública <strong>Contato</strong> você deseja
          editar.
        </>
      }
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero da página"
          descricao="Título e texto principal do topo da página."
          href={r.hero}
        />
        <AdminHubCard
          titulo="Canais oficiais"
          descricao="E-mails e telefones exibidos nos cards."
          href={r.canais}
        />
        <AdminHubCard
          titulo="Endereço e mapa"
          descricao="Endereço físico e embed do Google Maps."
          href={r.endereco}
        />
        <AdminHubCard
          titulo="Formulário"
          descricao="Texto introdutório acima do formulário público."
          href={r.formulario}
        />
        <AdminHubCard
          titulo="CTA Final"
          descricao="Bloco verde final da página."
          href={r.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
