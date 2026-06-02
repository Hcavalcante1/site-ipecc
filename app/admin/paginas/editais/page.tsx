import Link from "next/link";
import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function EditaisAdminIndex() {
  return (
    <AdminPaginasHubLayout
      titulo="Página — Editais"
      subtitulo={
        <>
          Escolha qual bloco da página pública <strong>Editais</strong> você deseja
          editar. Esta área controla textos e orientações da página; o cadastro
          do edital e do PDF fica no link de gerenciamento.
        </>
      }
      extra={
        <p style={{ marginTop: 8, fontSize: 14 }}>
          <Link href={adminCanonicalRoutes.editaisCadastro.lista}>
            Gerenciar editais e PDFs (cadastro) →
          </Link>
        </p>
      }
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero da página"
          descricao="Título e texto principal do topo da página pública /editais."
          href={adminCanonicalRoutes.editaisCms.hero}
        />
        <AdminHubCard
          titulo="Textos da página"
          descricao="Blocos textuais e conteúdo institucional da página /editais."
          href={adminCanonicalRoutes.editaisCms.textos}
        />
        <AdminHubCard
          titulo="Documentos"
          descricao="Checklist de documentos exigidos para participação nos editais."
          href={adminCanonicalRoutes.editaisCms.documentos}
        />
        <AdminHubCard
          titulo="Mural"
          descricao="Avisos, destaques ou conteúdos complementares da página /editais."
          href={adminCanonicalRoutes.editaisCms.mural}
        />
        <AdminHubCard
          titulo="CTA / Chamada final"
          descricao="Bloco final com texto de apoio e botão de ação para propostas."
          href={adminCanonicalRoutes.editaisCms.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
