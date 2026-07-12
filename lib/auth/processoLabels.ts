/** Labels de tipo de processo (Acessos / Processos). */

export const LABEL_TIPO_PROCESSO: Record<string, string> = {
  interno_ipecc: "Interno IPECC",
  publico_externo: "Contratação pública externa",
  privado_externo: "Contratação privada externa",
};

export const ORDEM_TIPO_PROCESSO = [
  "interno_ipecc",
  "publico_externo",
  "privado_externo",
] as const;

export function labelTipoProcesso(tipo?: string | null): string {
  if (!tipo) return "Tipo não informado";
  return LABEL_TIPO_PROCESSO[tipo] || tipo;
}

export function labelProcessoCompleto(p: {
  titulo: string;
  tipo?: string | null;
  status?: string | null;
}): string {
  const status = p.status ? ` · ${p.status}` : "";
  return `${p.titulo} · ${labelTipoProcesso(p.tipo)}${status}`;
}

export function chipsModulosEscopo(e: {
  mod_editais?: boolean;
  mod_propostas?: boolean;
  mod_transparencia?: boolean;
  mod_noticias?: boolean;
  mod_eventos?: boolean;
  mod_projetos?: boolean;
}): string[] {
  const chips: string[] = [];
  if (e.mod_editais) chips.push("Editais");
  if (e.mod_propostas) chips.push("Propostas");
  if (e.mod_transparencia) chips.push("Transparência");
  if (e.mod_noticias) chips.push("Notícias");
  if (e.mod_eventos) chips.push("Eventos");
  if (e.mod_projetos) chips.push("Projetos");
  return chips;
}
