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
  LABEL_STATUS_ASSINATURA,
  LABEL_PROVIDER_ASSINATURA,
  LABEL_SUBJECT_TYPE,
  LABEL_TEMPLATE_KIND,
  NAV_GESTAO_DOCUMENTAL,
  rotuloPermissao,
  rotuloProviderAssinatura,
  rotuloStatus,
  rotuloStatusAssinatura,
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
  documentoConfigurado,
  documentoApiBaseUrl,
  documentoConfigurado as documensoConfigurado,
  documentoApiBaseUrl as documensoApiBaseUrl,
} from "./signature/DocumentoProvider";
export { ipeccConfigurado } from "./signature/IpeccProvider";
export {
  CONSENTIMENTO_ASSINATURA_IPECC,
  IPECC_PROVIDER_CODE,
} from "./signing/constants";
export {
  listarEvidenciasAssinatura,
  buscarEvidenciaPorId,
  gerarLaudoTexto,
  gerarLaudoCsv,
} from "./signing/laudoService";
export {
  checkRateLimit,
  assinaturaRateKey,
  validarPublicoRateKey,
} from "./signing/rateLimit";
export {
  criarAssinaturaDocumento,
  enviarParaAssinaturaDocumento,
  enviarParaAssinaturaDocumento as enviarParaAssinaturaDocumenso,
  enviarLoteParaAssinaturaDocumento,
  listarAssinaturas,
  excluirAssinaturaDocumento,
  listarLotes,
  listarSignatarios,
  providerStatusResumo,
  resolverProviderPadrao,
} from "./signatureService";
export {
  listarNotificacoes,
  notificarEventoDocumental,
} from "./notificationsService";
