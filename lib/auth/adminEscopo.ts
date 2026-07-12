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
  | "logs"
  | "processos"
  | "acessos";

export type AdminEscopo = {
  id: string;
  processo_id: string | null;
  modalidade: string | null;
  mod_editais: boolean;
  mod_propostas: boolean;
  mod_transparencia: boolean;
  mod_noticias: boolean;
  mod_eventos: boolean;
  mod_projetos: boolean;
  mod_digital: boolean;
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
  >
> = {
  editais: "mod_editais",
  propostas: "mod_propostas",
  transparencia: "mod_transparencia",
  noticias: "mod_noticias",
  eventos: "mod_eventos",
  projetos: "mod_projetos",
  digital: "mod_digital",
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
    if (escopo.mod_propostas) set.add("propostas");
    if (escopo.mod_transparencia) set.add("transparencia");
    if (escopo.mod_noticias) set.add("noticias");
    if (escopo.mod_eventos) set.add("eventos");
    if (escopo.mod_projetos) {
      set.add("projetos");
    }
    if (escopo.mod_digital) set.add("digital");
  }
  return Array.from(set);
}

export function podeModulo(ctx: AdminContexto, modulo: AdminModulo): boolean {
  if (isMestre(ctx)) return true;
  return modulosPermitidos(ctx).includes(modulo);
}

export function processoIdsDoEscopo(ctx: AdminContexto): string[] | "todos" {
  if (isMestre(ctx)) return "todos";
  const ids = ctx.escopos
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
  modulo: keyof typeof MODULO_FLAG,
  processoId: string | null | undefined
): boolean {
  if (isMestre(ctx)) return true;
  if (!processoId) return false;
  const flag = MODULO_FLAG[modulo];
  return ctx.escopos.some(
    (e) => e.processo_id === processoId && Boolean(e[flag])
  );
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
