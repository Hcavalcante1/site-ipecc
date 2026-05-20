import {
  CHAVES_POR_GRUPO,
  COLUNA_URL_POR_CHAVE,
  GRUPOS_CHECKLIST,
} from "./constants";
import { labelInstitucionalDocumento } from "./helpers";
import type { GrupoChecklistId, ItemChecklistDocumental } from "./types";

export function extrairMensagemPrincipal(mensagem?: string) {
  if (!mensagem) return "—";

  const linhas = mensagem
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !l.toLowerCase().startsWith("tipo de pessoa:") &&
        !l.toLowerCase().startsWith("categoria:") &&
        !l.toLowerCase().startsWith("anexos enviados:") &&
        !l.toLowerCase().startsWith("anexos enviados —") &&
        !l.toLowerCase().startsWith("anexos complementares:") &&
        !l.toLowerCase().startsWith("envio completo com múltiplas categorias")
    );

  return linhas.length ? linhas.join("\n") : "—";
}

export function grupoPorChave(chave: string): GrupoChecklistId {
  const normalizada = chave.trim().toLowerCase();
  for (const grupo of GRUPOS_CHECKLIST) {
    if (grupo.id === "outros") continue;
    if (CHAVES_POR_GRUPO[grupo.id].includes(normalizada)) {
      return grupo.id;
    }
  }
  return "outros";
}

export function grupoPorTituloSecao(titulo: string): GrupoChecklistId | null {
  const t = titulo.toLowerCase();
  if (t.includes("habilitação") || t.includes("habilitacao") || t.includes("institucional")) {
    return "habilitacao_juridica";
  }
  if (t.includes("regularidade") || t.includes("fiscal") || t.includes("trabalhista")) {
    return "regularidade_fiscal_trabalhista";
  }
  if (t.includes("qualificação") || t.includes("qualificacao") || t.includes("operacional")) {
    return "qualificacao_tecnica";
  }
  return null;
}

export function parseParesAnexos(texto: string) {
  return texto
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [chave, ...resto] = item.split(":");
      return {
        chave: (chave || "").trim().toLowerCase(),
        valor: resto.join(":").trim(),
      };
    })
    .filter((item) => item.chave);
}

export function extrairAnexosDaMensagem(mensagem?: string) {
  const porGrupo: Record<GrupoChecklistId, Map<string, ItemChecklistDocumental>> = {
    habilitacao_juridica: new Map(),
    regularidade_fiscal_trabalhista: new Map(),
    qualificacao_tecnica: new Map(),
    outros: new Map(),
  };

  if (!mensagem) return porGrupo;

  const linhas = mensagem.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const linha of linhas) {
    const matchSecao = linha.match(/^anexos enviados\s*[—–-]\s*(.+?):\s*(.+)$/i);
    if (matchSecao) {
      const tituloSecao = matchSecao[1].trim();
      const conteudo = matchSecao[2].trim();
      const grupo =
        grupoPorTituloSecao(tituloSecao) ?? grupoPorChave(parseParesAnexos(conteudo)[0]?.chave || "");

      parseParesAnexos(conteudo).forEach(({ chave, valor }) => {
        const grupoFinal = grupoPorChave(chave) !== "outros" ? grupoPorChave(chave) : grupo;
        porGrupo[grupoFinal].set(chave, {
          key: chave,
          label: labelInstitucionalDocumento(chave),
          path: valor || null,
          origem: "mensagem",
        });
      });
      continue;
    }

    if (linha.toLowerCase().startsWith("anexos enviados:")) {
      const conteudo = linha.replace(/^anexos enviados:\s*/i, "").trim();
      parseParesAnexos(conteudo).forEach(({ chave, valor }) => {
        const grupo = grupoPorChave(chave);
        porGrupo[grupo].set(chave, {
          key: chave,
          label: labelInstitucionalDocumento(chave),
          path: valor || null,
          origem: "mensagem",
        });
      });
    }
  }

  return porGrupo;
}

export function mesclarColunasProposta(
  proposta: Record<string, unknown>,
  porGrupo: Record<GrupoChecklistId, Map<string, ItemChecklistDocumental>>
) {
  Object.entries(COLUNA_URL_POR_CHAVE).forEach(([chave, coluna]) => {
    const path = proposta[coluna];
    if (typeof path !== "string" || !path.trim()) return;

    const grupo = grupoPorChave(chave);
    const existente = porGrupo[grupo].get(chave);
    porGrupo[grupo].set(chave, {
      key: chave,
      label: labelInstitucionalDocumento(chave),
      path: path.trim(),
      origem: existente?.origem === "mensagem" ? "mensagem" : "coluna",
    });
  });
}

export function montarChecklistDocumental(
  proposta: Record<string, unknown> | null,
  mensagem?: string
) {
  const porGrupo = extrairAnexosDaMensagem(mensagem);
  if (proposta) {
    mesclarColunasProposta(proposta, porGrupo);
  }

  return GRUPOS_CHECKLIST.map((grupo) => ({
    ...grupo,
    itens: Array.from(porGrupo[grupo.id].values()).sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR")
    ),
  }));
}

export function extrairResumoAnexos(mensagem?: string) {
  if (!mensagem) return [];

  const linha = mensagem
    .split("\n")
    .find(
      (item) =>
        item.trim().toLowerCase().startsWith("anexos enviados:") ||
        item.trim().toLowerCase().startsWith("anexos complementares:")
    );

  if (!linha) return [];

  const texto = linha
    .replace(/^anexos enviados:\s*/i, "")
    .replace(/^anexos complementares:\s*/i, "")
    .trim();

  if (!texto) return [];

  return texto
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [chave, ...resto] = item.split(":");
      return {
        chave: (chave || "").trim(),
        valor: resto.join(":").trim(),
      };
    });
}
