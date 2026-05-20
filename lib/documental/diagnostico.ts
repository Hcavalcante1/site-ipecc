import { CHAVES_CERTIDAO_NUCLEO, NUCLEO_POR_TIPO } from "./constants";
import {
  certidaoAssociadaChave,
  certidaoEstaIrregular,
  formatarDataCertidao,
  situacaoValidadeCertidao,
} from "./certidoes";
import { labelInstitucionalDocumento } from "./helpers";
import { LABEL_STATUS_DOCUMENTAL } from "./labels";
import {
  chavesCondicionaisPorTipo,
  chavesEnviadasProposta,
  normalizarTipoProposta,
} from "./nucleo";
import { montarChecklistDocumental } from "./parser";
import type {
  CertidaoEntidadeLinha,
  DiagnosticoDocumental,
  StatusDocumentalAuto,
} from "./types";

export function calcularDiagnosticoDocumental(
  proposta: Record<string, unknown> | null,
  tipoRaw: string | undefined,
  checklist: ReturnType<typeof montarChecklistDocumental>,
  certidoes: CertidaoEntidadeLinha[],
  cnpjDigitos: string
): DiagnosticoDocumental {
  const tipo = normalizarTipoProposta(tipoRaw);
  const nucleo = NUCLEO_POR_TIPO[tipo];
  const enviadas = chavesEnviadasProposta(proposta, checklist);
  const podeCruzarCertidoes = cnpjDigitos.length === 14;

  const listaVerde: string[] = [];
  const listaLaranja: string[] = [];
  const listaVermelha: string[] = [];
  const alertasCertidoes: string[] = [];

  nucleo.forEach((chave) => {
    if (enviadas.has(chave)) {
      listaVerde.push(labelInstitucionalDocumento(chave));
    } else {
      listaVermelha.push(
        `Falta no envio (núcleo): ${labelInstitucionalDocumento(chave)}`
      );
    }
  });

  if (podeCruzarCertidoes) {
    CHAVES_CERTIDAO_NUCLEO.forEach((chave) => {
      if (!nucleo.includes(chave)) return;

      const enviado = enviadas.has(chave);
      const cert = certidaoAssociadaChave(chave, certidoes);

      if (!enviado && !cert) {
        listaVermelha.push(
          `${labelInstitucionalDocumento(chave)}: ausente no envio e no cadastro institucional (CNPJ)`
        );
      }

      if (cert) {
        const validade = situacaoValidadeCertidao(cert.validade_ate);
        if (certidaoEstaIrregular(cert)) {
          const alerta = `${cert.tipo_nome}: vencida ou irregular (validade ${formatarDataCertidao(cert.validade_ate)} — ${validade.texto})`;
          alertasCertidoes.push(alerta);
          listaVermelha.push(`Pendência grave: ${alerta}`);
        } else if (!enviado) {
          alertasCertidoes.push(
            `${cert.tipo_nome}: cadastrada no IPECC (válida até ${formatarDataCertidao(cert.validade_ate)}), não anexada na proposta`
          );
        }
      }
    });
  }

  chavesCondicionaisPorTipo(tipo).forEach((chave) => {
    if (!enviadas.has(chave)) {
      listaLaranja.push(
        `Condicional não enviado: ${labelInstitucionalDocumento(chave)}`
      );
    }
  });

  const nucleoEncontrados = nucleo.filter((chave) => enviadas.has(chave)).length;
  const nucleoTotal = nucleo.length;
  const faltaNucleo = nucleoEncontrados < nucleoTotal;
  const irregularCertidao = listaVermelha.some((item) =>
    item.toLowerCase().includes("vencida ou irregular")
  );

  let status: StatusDocumentalAuto;
  if (faltaNucleo) {
    status = "documentacao_pendente";
  } else if (irregularCertidao) {
    status = "documentacao_irregular";
  } else if (listaLaranja.length > 0) {
    status = "em_analise";
  } else {
    status = "documentacao_completa";
  }

  return {
    status,
    statusLabel: LABEL_STATUS_DOCUMENTAL[status],
    nucleoEncontrados,
    nucleoTotal,
    listaVerde,
    listaLaranja,
    listaVermelha,
    alertasCertidoes,
  };
}
