/** Tipos do módulo Gestão Documental (Fase 1). */

export const GD_DOCUMENT_STATUSES = [
  "draft",
  "in_review",
  "awaiting_approval",
  "approved",
  "rejected",
  "ready_to_sign",
  "signed",
  "archived",
] as const;

export type GdDocumentStatus = (typeof GD_DOCUMENT_STATUSES)[number];

export function isGdDocumentStatus(v: string): v is GdDocumentStatus {
  return (GD_DOCUMENT_STATUSES as readonly string[]).includes(v);
}

export type GdFolder = {
  id: string;
  processo_id: string | null;
  parent_id: string | null;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdCategory = {
  id: string;
  processo_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdDocument = {
  id: string;
  processo_id: string | null;
  folder_id: string | null;
  category_id: string | null;
  title: string;
  number: string | null;
  description: string | null;
  status: GdDocumentStatus;
  current_version: number;
  favorite: boolean;
  storage_path: string | null;
  mime_type: string | null;
  file_name: string | null;
  file_size: number | null;
  file_hash: string | null;
  workflow_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdDocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  mime_type: string | null;
  file_name: string | null;
  file_size: number | null;
  file_hash: string | null;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
};

export type GdDocumentTag = {
  id: string;
  document_id: string;
  tag: string;
  created_at: string;
};

export const GD_TEMPLATE_KINDS = [
  "contrato",
  "oficio",
  "declaracao",
  "plano_trabalho",
  "prestacao_contas",
  "convenio",
  "relatorio",
  "ata",
  "termo",
  "pdf",
  "docx",
  "html",
  "outro",
] as const;

export type GdTemplateKind = (typeof GD_TEMPLATE_KINDS)[number];

export function isGdTemplateKind(v: string): v is GdTemplateKind {
  return (GD_TEMPLATE_KINDS as readonly string[]).includes(v);
}

export const GD_TEMPLATE_FORMATS = ["pdf", "docx", "html"] as const;
export type GdTemplateFormat = (typeof GD_TEMPLATE_FORMATS)[number];

export function isGdTemplateFormat(v: string): v is GdTemplateFormat {
  return (GD_TEMPLATE_FORMATS as readonly string[]).includes(v);
}

export type GdDocumentTemplate = {
  id: string;
  processo_id: string | null;
  name: string;
  kind: GdTemplateKind;
  format: GdTemplateFormat;
  body: string | null;
  storage_path: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdDocumentLog = {
  id: string;
  processo_id: string | null;
  document_id: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

export type GdPreviewKind = "pdf" | "image" | "text" | "unsupported";

export const GD_PERMISSIONS = [
  "admin",
  "gestor",
  "revisor",
  "aprovador",
  "signatario",
  "consulta",
] as const;

export type GdPermission = (typeof GD_PERMISSIONS)[number];

export function isGdPermission(v: string): v is GdPermission {
  return (GD_PERMISSIONS as readonly string[]).includes(v);
}

export const GD_SUBJECT_TYPES = ["user", "group", "role"] as const;
export type GdSubjectType = (typeof GD_SUBJECT_TYPES)[number];

export function isGdSubjectType(v: string): v is GdSubjectType {
  return (GD_SUBJECT_TYPES as readonly string[]).includes(v);
}

export type GdWorkflow = {
  id: string;
  processo_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdWorkflowStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  name: string;
  from_status: string | null;
  to_status: string | null;
  role_required: string | null;
  parallel: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GdWorkflowHistory = {
  id: string;
  document_id: string;
  workflow_id: string | null;
  step_id: string | null;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  actor_id: string | null;
  created_at: string;
};

export type GdDocumentPermission = {
  id: string;
  document_id: string | null;
  processo_id: string | null;
  subject_type: GdSubjectType;
  subject_id: string;
  permission: GdPermission;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Passos sugeridos ao criar fluxo padrão institucional. */
export const GD_DEFAULT_WORKFLOW_STEPS: Array<{
  step_order: number;
  name: string;
  from_status: string;
  to_status: string;
  role_required: string;
}> = [
  {
    step_order: 1,
    name: "Enviar para revisão",
    from_status: "draft",
    to_status: "in_review",
    role_required: "gestor",
  },
  {
    step_order: 2,
    name: "Encaminhar para aprovação",
    from_status: "in_review",
    to_status: "awaiting_approval",
    role_required: "revisor",
  },
  {
    step_order: 3,
    name: "Rejeitar na revisão",
    from_status: "in_review",
    to_status: "rejected",
    role_required: "revisor",
  },
  {
    step_order: 4,
    name: "Aprovar",
    from_status: "awaiting_approval",
    to_status: "approved",
    role_required: "aprovador",
  },
  {
    step_order: 5,
    name: "Rejeitar na aprovação",
    from_status: "awaiting_approval",
    to_status: "rejected",
    role_required: "aprovador",
  },
  {
    step_order: 6,
    name: "Liberar para assinatura",
    from_status: "approved",
    to_status: "ready_to_sign",
    role_required: "gestor",
  },
  {
    step_order: 7,
    name: "Registrar assinatura",
    from_status: "ready_to_sign",
    to_status: "signed",
    role_required: "signatario",
  },
  {
    step_order: 8,
    name: "Arquivar",
    from_status: "signed",
    to_status: "archived",
    role_required: "gestor",
  },
];

export type GdDashboardCounts = {
  ativos: number;
  em_revisao: number;
  pendentes: number;
  prontos_assinatura: number;
  assinados: number;
  rejeitados: number;
  arquivados: number;
  lotes_ativos: number;
};

export const GD_STORAGE_BUCKET = "gestao-documental";

export const GD_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
]);

export const GD_MIME_BY_EXTENSION: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ]),
  doc: new Set(["application/msword", "application/octet-stream"]),
  png: new Set(["image/png"]),
  jpg: new Set(["image/jpeg"]),
  jpeg: new Set(["image/jpeg"]),
  webp: new Set(["image/webp"]),
  txt: new Set(["text/plain", "application/octet-stream"]),
};
