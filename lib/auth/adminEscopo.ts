/**
 * Escopos e papeis do multi-admin (Fase 1).
 * Processo = pasta de permissao; conteudo publicado segue nas rotas publicas atuais.
 */

export type AdminPapel = "mestre" | "operador" | "externo";

export type AdminModulo =
  | "editais"
  | "propostas"
  | "transparencia"
  | "noticias"
  | "eventos"
  | "projetos"
  | "paginas"
  | "certidoes"
  | "whatsapp"
  | "digital"
  | "documentos"
  | "logs"
  | "processos"
  | "acessos";

export type AdminEscopo = {
  id: string;
  processo_id: string | null;
  proposta_id?: string | null;
  modalidade: string | null;
  mod_editais: boolean;
  mod_propostas: boolean;
  mod_transparencia: boolean;
  mod_noticias: boolean;
  mod_eventos: boolean;
  mod_projetos: boolean;
  mod_digital: boolean;
  mod_documentos: boolean;
};

export type AdminContexto = {
  userId: string;
  email?: string | null;
  papel: AdminPapel;
  ativo: boolean;
  escopos: AdminEscopo[];
  /** true se veio so do is_admin legado, sem linha em admin_perfis */
  legadoIsAdmin: boolean;
};

export const MODULOS_MESTRE: AdminModulo[] = [
  "paginas",
  "editais",
  "noticias",
  "eventos",
  "propostas",
  "certidoes",
  "whatsapp",
  "digital",
  "documentos",
  "logs",
  "processos",
  "acessos",
  "transparencia",
  "projetos",
];

const MODULO_FLAG: Record<
  Exclude<
    AdminModulo,
    | "paginas"
    | "certidoes"
    | "whatsapp"
    | "logs"
    | "processos"
    | "acessos"
  >,
  keyof Pick<
    AdminEscopo,
    | "mod_editais"
    | "mod_propostas"
    | "mod_transparencia"
    | "mod_noticias"
    | "mod_eventos"
    | "mod_projetos"
    | "mod_digital"
    | "mod_documentos"
  >
> = {
  editais: "mod_editais",
  propostas: "mod_propostas",
  transparencia: "mod_transparencia",
  noticias: "mod_noticias",
  eventos: "mod_eventos",
  projetos: "mod_projetos",
  digital: "mod_digital",
  documentos: "mod_documentos",
};

export function isMestre(ctx: AdminContexto | null | undefined): boolean {
  if (!ctx) return false;
  return ctx.papel === "mestre" || ctx.legadoIsAdmin;
}

export function modulosPermitidos(ctx: AdminContexto): AdminModulo[] {
  if (isMestre(ctx)) return [...MODULOS_MESTRE];

  const set = new Set<AdminModulo>();
  for (const escopo of ctx.escopos) {
    if (escopo.mod_editais) set.add("editais");
    if (escopo.mod_transparencia) set.add("transparencia");
    if (escopo.mod_noticias) set.add("noticias");
    if (escopo.mod_eventos) set.add("eventos");
    if (escopo.mod_projetos) {
      set.add("projetos");
    }
    if (escopo.mod_digital) set.add("digital");
    if (escopo.mod_documentos) set.add("documentos");
  }
  return Array.from(set);
}

export function podeModulo(ctx: AdminContexto, modulo: AdminModulo): boolean {
  if (isMestre(ctx)) return true;
  return modulosPermitidos(ctx).includes(modulo);
}

export type AdminModuloEscopado = keyof typeof MODULO_FLAG;

export function processoIdsDoEscopo(ctx: AdminContexto, modulo?: AdminModuloEscopado): string[] | "todos" {
  if (isMestre(ctx)) return "todos";
  const ids = ctx.escopos
    .filter((e) => !e.proposta_id && (modulo ? Boolean(e[MODULO_FLAG[modulo]]) : Object.values(MODULO_FLAG).some((flag) => Boolean(e[flag]))))
    .map((e) => e.processo_id)
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

export function podeAcessarProcesso(
  ctx: AdminContexto,
  processoId: string | null | undefined
): boolean {
  if (isMestre(ctx)) return true;
  if (!processoId) return false;
  const ids = processoIdsDoEscopo(ctx);
  if (ids === "todos") return true;
  return ids.includes(processoId);
}

export function podeModuloNoProcesso(
  ctx: AdminContexto,
  modulo: AdminModuloEscopado,
  processoId: string | null | undefined
): boolean {
  if (isMestre(ctx)) return true;
  if (modulo === "propostas") return false;
  if (!processoId) return false;
  const flag = MODULO_FLAG[modulo];
  return ctx.escopos.some(
    (e) => !e.proposta_id && e.processo_id === processoId && Boolean(e[flag])
  );
}


export function propostaIdsDoEscopo(_ctx: AdminContexto): string[] {
  return [];
}

export function podeModuloNaProposta(ctx: AdminContexto, modulo: AdminModuloEscopado, processoId: string | null | undefined, propostaId: string | null | undefined): boolean {
  if (isMestre(ctx)) return true;
  return false;
  const flag = MODULO_FLAG[modulo];
  return ctx.escopos.some((e) => Boolean(e[flag]) && e.processo_id === processoId && (!e.proposta_id || e.proposta_id === propostaId));
}

export function registroNoEscopoProposta(propostaId: string, processoId: string | null | undefined, processoIds: string[] | "todos", propostaIds: string[]): boolean {
  return processoIds === "todos" || Boolean(processoId && processoIds.includes(processoId)) || propostaIds.includes(propostaId);
}

/** Listagens admin: mestre vê tudo; demais só itens do processo do escopo. */
export function registroNoEscopoProcesso(
  processoId: string | null | undefined,
  processoIds: string[] | "todos"
): boolean {
  if (processoIds === "todos") return true;
  if (!processoId) return false;
  return processoIds.includes(processoId);
}
