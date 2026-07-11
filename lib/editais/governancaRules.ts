/**
 * Regras institucionais de editais — fonte unica de verdade.
 *
 * Rascunho = sandbox de testes (exclusao permitida, site publico oculto).
 * Apos sair de rascunho = processo real (auditoria, sem exclusao).
 */

export type EditalCamposGovernanca = {
  status?: string | null;
  fase_atual?: string | null;
};

export function normalizarFaseEdital(fase?: string | null): string {
  const valor = String(fase ?? "").trim();
  return valor || "rascunho";
}

export function normalizarStatusEdital(status?: string | null): string {
  return String(status ?? "").trim();
}

/** Fase sandbox — unica em que Excluir e permitido (valor explicito no banco). */
export function isEditalFaseRascunho(faseAtual?: string | null): boolean {
  return String(faseAtual ?? "").trim() === "rascunho";
}

export const MSG_EXCLUSAO_SOMENTE_RASCUNHO =
  "Exclusao permitida apenas na fase Rascunho (testes). Editais publicados ou em processo institucional devem ser encerrados pela governanca, nao excluidos.";

export const MSG_REVERTER_RASCUNHO_BLOQUEADO =
  "Nao e possivel voltar para Rascunho: existem propostas aprovadas vinculadas. Encerre o processo pela governanca em vez de reverter fase de teste.";

export const MSG_SAIDA_RASCUNHO =
  "Ao sair da fase Rascunho, o edital passa a processo institucional: nao podera mais ser excluido e passara a aparecer no site publico conforme a fase.";

/** Listagem e detalhe em /editais — rascunho nunca aparece. */
export function editalVisivelNoSitePublico(edital: EditalCamposGovernanca): boolean {
  return !isEditalFaseRascunho(edital.fase_atual);
}

/**
 * Envio em /propostas:
 * - Rascunho + status aberto = testes internos (admin habilita).
 * - publicado + aberto = processo ja aberto ao publico (ex.: cotacao previa).
 * - recebimento_propostas + nao encerrado = processo real de propostas.
 */
export function editalAceitaEnvioProposta(edital: EditalCamposGovernanca): boolean {
  const fase = normalizarFaseEdital(edital.fase_atual);
  const status = normalizarStatusEdital(edital.status);

  if (status === "encerrado" || fase === "encerrado") return false;

  if (fase === "rascunho") {
    return status === "aberto";
  }

  if (fase === "recebimento_propostas") return true;

  // Cotacao / edital publicado com status aberto ja pode receber envio.
  return fase === "publicado" && status === "aberto";
}

export function isEnvioPropostaModoTeste(edital: EditalCamposGovernanca): boolean {
  return (
    isEditalFaseRascunho(edital.fase_atual) &&
    normalizarStatusEdital(edital.status) === "aberto"
  );
}

/** URL para o admin consultar o edital antes de aprovar/rejeitar proposta. */
export function getUrlConsultaEditalAdmin(
  editalId: string,
  edital?: EditalCamposGovernanca | null
): string {
  if (edital && isEditalFaseRascunho(edital.fase_atual)) {
    return `/admin/editais/${editalId}/governanca`;
  }
  return `/editais/${editalId}`;
}

export function getRotuloVinculoProposta(status?: string | null): string {
  const valor = normalizarStatusEdital(status) || "pendente";
  if (valor === "aprovado") return "Vinculo oficial";
  if (valor === "rejeitado") return "Rejeitada";
  return "Em analise";
}

export function propostaTemVinculoOficial(status?: string | null): boolean {
  return normalizarStatusEdital(status) === "aprovado";
}

export function getMensagemEnvioPropostaInstitucional(
  edital: EditalCamposGovernanca
): { tipo: "ok" | "info" | "aviso"; texto: string } {
  if (editalAceitaEnvioProposta(edital)) {
    if (isEnvioPropostaModoTeste(edital)) {
      return {
        tipo: "ok",
        texto:
          "Ambiente de testes: envio habilitado para este edital em fase Rascunho (nao aparece no site publico).",
      };
    }
    return {
      tipo: "ok",
      texto: "O envio de propostas esta aberto para este edital.",
    };
  }

  const fase = normalizarFaseEdital(edital.fase_atual);
  const status = normalizarStatusEdital(edital.status);

  if (fase === "rascunho") {
    return {
      tipo: "info",
      texto:
        "Edital em preparacao (Rascunho). O envio de testes so abre quando o status estiver Aberto no admin.",
    };
  }

  if (status === "em_breve") {
    return {
      tipo: "info",
      texto: "O periodo de envio de propostas ainda nao foi aberto para este edital.",
    };
  }

  if (status === "encerrado" || fase === "encerrado") {
    return {
      tipo: "aviso",
      texto: "O periodo de envio de propostas esta encerrado para este edital.",
    };
  }

  if (fase !== "recebimento_propostas") {
    return {
      tipo: "info",
      texto: "O envio de propostas nao esta disponivel nesta fase do processo.",
    };
  }

  return {
    tipo: "info",
    texto: "O envio de propostas nao esta disponivel para este edital no momento.",
  };
}
