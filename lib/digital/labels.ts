import type {
  DigitalPlatform,
  DigitalPostSource,
  DigitalPostStatus,
} from "./types";

/** Rótulos em português para a interface admin. */
export const LABEL_STATUS: Record<DigitalPostStatus, string> = {
  draft: "rascunho",
  approved: "aprovado",
  scheduled: "agendado",
  published_manual: "publicado manualmente nas redes",
  archived: "arquivado",
};

export const AJUDA_PUBLICACAO_ASSISTIDA =
  "Fluxo assistido: aprove e use «Publicar agora (fila)». Com o agente Windows instalado uma vez, a publicação sai sozinha. Alternativa: Instagram legado (API Meta).";

/** Instalação única do agente residente (PowerShell na raiz do projeto). */
export const COMANDO_INSTALAR_AGENTE =
  "powershell -ExecutionPolicy Bypass -File scripts\\install-digital-agent-windows.ps1";

/** Rótulos de automação da fila (worker Playwright). */
export const LABEL_AUTOMACAO: Record<string, string> = {
  pending: "Pendente",
  queued: "Na fila",
  processing: "Processando",
  partially_published: "Parcialmente publicado",
  published: "Publicado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export function rotuloAutomacao(
  status: string | null | undefined,
  opts?: { agentOnline?: boolean }
): string {
  if (!status) return "—";
  if (
    (status === "queued" || status === "pending") &&
    opts?.agentOnline === false
  ) {
    return "Na fila · aguardando computador";
  }
  return LABEL_AUTOMACAO[status] ?? status;
}
export function formatarDataAgendada(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export const LABEL_ORIGEM: Record<DigitalPostSource, string> = {
  manual: "manual",
  agent_noticia: "agente · notícia",
  agent_evento: "agente · evento",
  agent_projeto: "agente · projeto",
};

export const LABEL_PLATAFORMA: Record<DigitalPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

export const LABEL_ESCOPO = {
  site: "site (institucional)",
  projeto: "por projeto",
} as const;

export function rotuloStatus(status: string): string {
  return LABEL_STATUS[status as DigitalPostStatus] ?? status;
}

export function rotuloOrigem(origem: string): string {
  return LABEL_ORIGEM[origem as DigitalPostSource] ?? origem;
}

export function rotuloPlataforma(platform: string): string {
  return LABEL_PLATAFORMA[platform as DigitalPlatform] ?? platform;
}
