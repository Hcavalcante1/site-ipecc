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
  "Fluxo assistido: aprove, agende se quiser, copie o texto ou publique no Instagram (exige imagem pública e tokens Meta no servidor).";

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
