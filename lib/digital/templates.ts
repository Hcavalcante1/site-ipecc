import type { DigitalDraftInput } from "./types";
import { getPublicSiteUrl } from "@/lib/seo";

function siteBase(): string {
  return getPublicSiteUrl();
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

const HASHTAGS_BASE =
  "#IPECC #Educacao #Cultura #Esporte #Cidadania #SaoPaulo";

export function draftFromNoticia(input: {
  id: string;
  titulo: string;
  resumo?: string | null;
}): DigitalDraftInput {
  const resumo = (input.resumo || "").trim();
  const body = [
    input.titulo.trim(),
    resumo || "Confira no portal do Instituto Paulista de Esporte, Cultura e Cidadania (IPECC).",
    "",
    `Leia mais: ${absoluteUrl("/inicio")}`,
  ].join("\n");

  return {
    title: input.titulo.trim().slice(0, 120),
    body,
    hashtags: `${HASHTAGS_BASE} #Noticias`,
    source_type: "agent_noticia",
    source_id: input.id,
    linkPath: "/inicio",
  };
}

export function draftFromEvento(input: {
  id: string;
  titulo: string;
  data_evento?: string | null;
  local?: string | null;
}): DigitalDraftInput {
  const data = input.data_evento
    ? new Date(input.data_evento).toLocaleDateString("pt-BR")
    : null;
  const linhas = [
    `Agenda IPECC: ${input.titulo.trim()}`,
    data ? `Data: ${data}` : null,
    input.local?.trim() ? `Local: ${input.local.trim()}` : null,
    "",
    "Participe das ações do Instituto Paulista de Esporte, Cultura e Cidadania.",
    `Agenda completa: ${absoluteUrl("/eventos")}`,
  ].filter(Boolean) as string[];

  return {
    title: input.titulo.trim().slice(0, 120),
    body: linhas.join("\n"),
    hashtags: `${HASHTAGS_BASE} #Eventos`,
    source_type: "agent_evento",
    source_id: input.id,
    linkPath: "/eventos",
  };
}

export function draftFromProjeto(input: {
  slug: string;
  titulo: string;
  texto: string;
  href: string;
}): DigitalDraftInput {
  const body = [
    input.titulo.trim(),
    input.texto.trim(),
    "",
    `Conheça o programa: ${absoluteUrl(input.href)}`,
  ].join("\n");

  return {
    title: input.titulo.trim().slice(0, 120),
    body,
    hashtags: `${HASHTAGS_BASE} #Projetos`,
    source_type: "agent_projeto",
    source_id: input.slug,
    linkPath: input.href,
  };
}
