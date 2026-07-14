import type { GdDocumentStatus } from "./types";

export const LABEL_STATUS: Record<GdDocumentStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  awaiting_approval: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  ready_to_sign: "Pronto para assinatura",
  signed: "Assinado",
  archived: "Arquivado",
};

export function rotuloStatus(status: string): string {
  return LABEL_STATUS[status as GdDocumentStatus] || status;
}

export const LABEL_STATUS_ASSINATURA: Record<string, string> = {
  pending: "Pendente",
  ready: "Pronto para assinar",
  authorizing: "Autorizando",
  signing: "Em assinatura",
  signed: "Assinado",
  failed: "Falhou",
  cancelled: "Cancelado",
  rejected: "Recusado",
};

export function rotuloStatusAssinatura(status: string): string {
  return LABEL_STATUS_ASSINATURA[status] || status.replace(/_/g, " ");
}

export const LABEL_PROVIDER_ASSINATURA: Record<string, string> = {
  ipecc: "IPECC",
  documento: "Documento (legado)",
  documenso: "Documento (legado)",
  govbr: "gov.br",
  icp_brasil: "ICP-Brasil",
};

export function rotuloProviderAssinatura(code: string): string {
  return LABEL_PROVIDER_ASSINATURA[code] || code;
}

export const LABEL_TEMPLATE_KIND: Record<string, string> = {
  contrato: "Contrato",
  oficio: "Ofício",
  declaracao: "Declaração",
  plano_trabalho: "Plano de Trabalho",
  prestacao_contas: "Prestação de Contas",
  convenio: "Convênio",
  relatorio: "Relatório",
  ata: "Ata",
  termo: "Termo",
  pdf: "PDF",
  docx: "DOCX",
  html: "HTML",
  outro: "Outro",
};

export function rotuloTipoModelo(kind: string): string {
  return LABEL_TEMPLATE_KIND[kind] || kind.replace(/_/g, " ");
}

export const LABEL_PERMISSION: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor documental",
  revisor: "Revisor",
  aprovador: "Aprovador",
  signatario: "Signatário",
  consulta: "Consulta",
};

export function rotuloPermissao(p: string): string {
  return LABEL_PERMISSION[p] || p;
}

export const LABEL_SUBJECT_TYPE: Record<string, string> = {
  user: "Usuário",
  group: "Grupo",
  role: "Cargo",
};

export function rotuloTipoSujeito(t: string): string {
  return LABEL_SUBJECT_TYPE[t] || t;
}

export const NAV_GESTAO_DOCUMENTAL = [
  { href: "/admin/documentos/dashboard", label: "Dashboard" },
  { href: "/admin/documentos/documentos", label: "Documentos" },
  { href: "/admin/documentos/pastas", label: "Pastas" },
  { href: "/admin/documentos/categorias", label: "Categorias" },
  { href: "/admin/documentos/modelos", label: "Modelos" },
  { href: "/admin/documentos/lixeira", label: "Lixeira" },
  { href: "/admin/documentos/fluxos", label: "Fluxos" },
  { href: "/admin/documentos/assinaturas", label: "Assinaturas" },
  { href: "/admin/documentos/lotes", label: "Lotes" },
  { href: "/admin/documentos/signatarios", label: "Signatários" },
  { href: "/admin/documentos/notificacoes", label: "Notificações" },
  { href: "/admin/documentos/auditoria", label: "Auditoria" },
  { href: "/admin/documentos/configuracoes", label: "Configurações" },
] as const;
