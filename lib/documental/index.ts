export type {
  GrupoChecklistId,
  ItemChecklistDocumental,
  CertidaoEntidade,
  CertidaoEntidadeLinha,
  StatusDocumentalAuto,
  DiagnosticoDocumental,
  TipoPessoaDocumental,
} from "./types";

export {
  LABEL_INSTITUCIONAL_POR_CHAVE,
  LABEL_STATUS_DOCUMENTAL,
} from "./labels";

export { labelInstitucionalDocumento } from "./helpers";

export {
  GRUPOS_CHECKLIST,
  CHAVES_POR_GRUPO,
  COLUNA_URL_POR_CHAVE,
  NUCLEO_POR_TIPO,
  CHAVES_CERTIDAO_NUCLEO,
  PADROES_TIPO_CERTIDAO,
  CORES_STATUS_DOCUMENTAL,
} from "./constants";

export {
  extrairMensagemPrincipal,
  parseParesAnexos,
  extrairAnexosDaMensagem,
  grupoPorChave,
  grupoPorTituloSecao,
  mesclarColunasProposta,
  montarChecklistDocumental,
  extrairResumoAnexos,
} from "./parser";

export {
  normalizarTipoProposta,
  chavesEnviadasProposta,
  chavesCondicionaisPorTipo,
} from "./nucleo";

export {
  formatarDataCertidao,
  situacaoValidadeCertidao,
  certidaoAssociadaChave,
  certidaoEstaIrregular,
  somenteDigitosCnpj,
  labelCampoCertidao,
} from "./certidoes";

export { calcularDiagnosticoDocumental } from "./diagnostico";

export { formatarTipoPessoa, formatarCategoria } from "./display";

export {
  ANEXOS_URL_PROPOSTA,
  extrairAnexosProposta,
  extrairPathsAnexoProposta,
} from "./propostaPaths";
export type { AnexoPropostaRef, AnexoUrlPropostaKey } from "./propostaPaths";

export {
  usePropostaAnexosTableLeitura,
  resolverAnexosProposta,
  mesclarAnexosLegadoETabela,
  carregarAnexosTabelaPorPropostas,
  carregarAnexosResolvidosPorPropostas,
  anexoRowParaRef,
} from "./propostaAnexosHibrido";
export type { PropostaAnexoRow } from "./propostaAnexosHibrido";

export {
  usePropostaAnexosTableEscrita,
  montarLinhasAnexosProposta,
  sincronizarAnexosPropostaTabela,
} from "./propostaAnexosEscrita";
export type { OrigemPropostaAnexo } from "./propostaAnexosEscrita";
