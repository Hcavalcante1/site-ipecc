import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function TransparenciaAdminIndex() {
  const r = adminCanonicalRoutes.transparencia;

  return (
    <AdminPaginasHubLayout
      titulo="Página — Transparência"
      subtitulo={
        <>
          Escolha qual bloco da página pública <strong>Transparência</strong> você
          deseja editar.
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
          titulo="Compromissos e princípios"
          descricao="Texto institucional sobre ética, transparência e governança."
          href={r.compromissos}
        />
        <AdminHubCard
          titulo="Documentos institucionais"
          descricao="Estatuto, atas, CNDs, políticas e demais documentos públicos."
          href={r.documentos}
        />
        <AdminHubCard
          titulo="Termos e Convênios"
          descricao="Cadastro e edição da tabela pública de convênios e instrumentos."
          href={r.convenios}
        />
        <AdminHubCard
          titulo="Editais e Chamamentos"
          descricao="Cadastro e edição da tabela pública de editais e chamamentos."
          href={r.editais}
        />
        <AdminHubCard
          titulo="Prestação de contas"
          descricao="Relatórios técnicos e financeiros."
          href={r.prestacao}
        />
        <AdminHubCard
          titulo="LGPD"
          descricao="Política de privacidade, contatos e proteção de dados."
          href={r.lgpd}
        />
        <AdminHubCard
          titulo="CTA / Acesso rápido"
          descricao="Bloco final com botão de acesso a documentos."
          href={r.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
