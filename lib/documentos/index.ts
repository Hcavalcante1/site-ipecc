export type {
  GdCategory,
  GdDashboardCounts,
  GdDocument,
  GdDocumentLog,
  GdDocumentPermission,
  GdDocumentStatus,
  GdDocumentTag,
  GdDocumentTemplate,
  GdDocumentVersion,
  GdFolder,
  GdPermission,
  GdPreviewKind,
  GdSubjectType,
  GdTemplateFormat,
  GdTemplateKind,
  GdWorkflow,
  GdWorkflowHistory,
  GdWorkflowStep,
} from "./types";
export {
  GD_ALLOWED_EXTENSIONS,
  GD_DEFAULT_WORKFLOW_STEPS,
  GD_DOCUMENT_STATUSES,
  GD_MIME_BY_EXTENSION,
  GD_PERMISSIONS,
  GD_STORAGE_BUCKET,
  GD_SUBJECT_TYPES,
  GD_TEMPLATE_FORMATS,
  GD_TEMPLATE_KINDS,
  isGdDocumentStatus,
  isGdPermission,
  isGdSubjectType,
  isGdTemplateFormat,
  isGdTemplateKind,
} from "./types";
export {
  LABEL_PERMISSION,
  LABEL_STATUS,
  LABEL_SUBJECT_TYPE,
  LABEL_TEMPLATE_KIND,
  NAV_GESTAO_DOCUMENTAL,
  rotuloPermissao,
  rotuloStatus,
  rotuloTipoModelo,
  rotuloTipoSujeito,
} from "./labels";
export { denyIfSemModuloDocumentos } from "./adminGate";
export {
  contarDashboard,
  listarDocumentos,
  listarLogsDocumento,
  listarTagsDocumento,
  obterDocumento,
  registrarLog,
  DOC_SELECT,
  DOC_SELECT_SEM_WF,
} from "./documentsService";
export {
  extensionFromName,
  sha256Buffer,
  slugify,
  validarArquivoGestaoDocumental,
  validarTituloDocumento,
} from "./validators";
export { normalizarTag, previewKindFromMime } from "./preview";
export {
  carregarDocumentoNoEscopo,
  tabelaAusente,
} from "./scopeHelper";
export { requestAuditMeta } from "./auditMeta";
export type { RequestAuditMeta } from "./auditMeta";
export {
  listarHistoricoWorkflow,
  listarPassosWorkflow,
  listarPermissoesDocumento,
  listarWorkflows,
  obterWorkflow,
  usuarioPodePapelDocumento,
  WF_SELECT,
  STEP_SELECT,
} from "./workflowService";
export {
  getSignatureProvider,
  listSignatureProviderCodes,
} from "./signature";
export type { SignatureProvider } from "./signature/SignatureProvider";
export {
  govbrConfigurado,
  govbrRedirectUriPadrao,
} from "./signature/GovBrProvider";
export {
  criarAssinaturaDocumento,
  listarAssinaturas,
  listarLotes,
  listarSignatarios,
  providerStatusResumo,
} from "./signatureService";
export {
  listarNotificacoes,
  notificarEventoDocumental,
} from "./notificationsService";
