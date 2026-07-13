/** @deprecated Prefer DocumentoProvider — mantido só por compatibilidade. */
export {
  DocumentoProvider as DocumensoProvider,
  documentoApiBaseUrl as documensoApiBaseUrl,
  documentoConfigurado as documensoConfigurado,
  DocumentoProvider,
  documentoApiBaseUrl,
  documentoConfigurado,
  documentoWebhookSecret,
} from "./DocumentoProvider";
export type {
  DocumentoCreateEnvelopeInput as DocumensoCreateEnvelopeInput,
  DocumentoEnvelopeSummary as DocumensoEnvelopeSummary,
  DocumentoRecipientInput as DocumensoRecipientInput,
} from "./DocumentoProvider";
