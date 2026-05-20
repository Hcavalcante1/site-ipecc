import { PADROES_TIPO_CERTIDAO } from "./constants";
import type { CertidaoEntidadeLinha } from "./types";

export function formatarDataCertidao(iso: string) {
  const date = new Date(iso + "T12:00:00");
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

export function situacaoValidadeCertidao(validadeAte: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(validadeAte + "T12:00:00");
  const dias = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) {
    return { texto: "Vencida", cor: "#f97316" };
  }
  return { texto: "Válida", cor: "#22c55e" };
}

export function certidaoAssociadaChave(
  chave: string,
  certidoes: CertidaoEntidadeLinha[]
) {
  const padroes = PADROES_TIPO_CERTIDAO[chave] || [];
  return certidoes.find((cert) => {
    const ref = `${cert.tipo_nome} ${cert.orgao_emissor}`.toLowerCase();
    return padroes.some((padrao) => ref.includes(padrao));
  });
}

export function certidaoEstaIrregular(cert: CertidaoEntidadeLinha) {
  if (
    cert.status === "irregular" ||
    cert.status === "positiva" ||
    cert.status === "positiva_com_efeito_negativa" ||
    cert.status === "vencida"
  ) {
    return true;
  }
  return situacaoValidadeCertidao(cert.validade_ate).texto === "Vencida";
}

export function somenteDigitosCnpj(valor?: string | null) {
  if (!valor) return "";
  return valor.replace(/\D/g, "");
}

export function labelCampoCertidao(value: string) {
  return value.replace(/_/g, " ");
}
