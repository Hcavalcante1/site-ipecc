"use client";

import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

export default function TransparenciaAdminIndex() {
  const r = adminCanonicalRoutes.transparencia;
  const escopo = useAdminEscopoCliente();

  const podeSite =
    escopo.mestre || escopo.modulos.includes("paginas");
  const podeCiclo =
    escopo.mestre ||
    escopo.modulos.includes("transparencia") ||
    escopo.modulos.includes("paginas");

  if (escopo.loading) {
    return (
      <div style={{ padding: 24, color: "#e5e7eb" }}>Carregando...</div>
    );
  }

  return (
    <AdminPaginasHubLayout
      titulo="Transparencia"
      subtitulo={
        podeSite ? (
          <>
            Ciclo do processo (convenios, editais, prestacao) e blocos
            institucionais da pagina publica <strong>Transparencia</strong>.
            Rascunhos automaticos; publicacao no site continua humana.
          </>
        ) : (
          <>
            Modulo do seu processo: fecha o ciclo Editais e Propostas com
            rascunhos de convenios, resultados e prestacao. A publicacao no
            site continua humana. Conteudo institucional do site IPECC
            (destaque, LGPD, chamada) não aparece neste acesso.
          </>
        )
      }
    >
      <div className="admin-grid admin-grid--wide">
        {podeCiclo && (
          <>
            <AdminHubCard
              titulo="Termos e Convenios"
              descricao="Fecha o ciclo das propostas aprovadas (rascunhos automaticos + publicacao humana)."
              href={r.convenios}
            />
            <AdminHubCard
              titulo="Editais e Chamamentos"
              descricao="Espelho dos resultados/homologacao a partir da governanca do edital."
              href={r.editais}
            />
            <AdminHubCard
              titulo="Prestacao de contas"
              descricao="Rascunhos vinculados aos convenios do processo — publicar apos revisao."
              href={r.prestacao}
            />
          </>
        )}

        {podeSite && (
          <>
            <AdminHubCard
              titulo="Destaque / topo da página"
              descricao="Título e texto principal do topo da página (site IPECC)."
              href={r.hero}
            />
            <AdminHubCard
              titulo="Compromissos e principios"
              descricao="Texto institucional sobre etica, transparencia e governanca."
              href={r.compromissos}
            />
            <AdminHubCard
              titulo="Documentos institucionais"
              descricao="Estatuto, atas, CNDs, politicas e demais documentos publicos da entidade."
              href={r.documentos}
            />
            <AdminHubCard
              titulo="LGPD"
              descricao="Politica de privacidade, contatos e protecao de dados."
              href={r.lgpd}
            />
            <AdminHubCard
              titulo="Chamada / Acesso rápido"
              descricao="Bloco final com botao de acesso a documentos."
              href={r.cta}
            />
          </>
        )}
      </div>
    </AdminPaginasHubLayout>
  );
}
