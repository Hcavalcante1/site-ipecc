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

/** Ajuda do fluxo assistido (copiar → colar na rede → marcar). */
export const AJUDA_PUBLICACAO_ASSISTIDA =
  "Fluxo assistido: aprove o rascunho, copie o texto, cole na rede e marque como publicado. A publicação automática nas APIs das redes fica para uma fase futura.";

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
