import type { LoadedCertificate } from "./clientCertSign";

function onlyDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

function formatCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function getCertificateHolderLabel(cert: LoadedCertificate): string {
  const cnpj = onlyDigits(cert.icpBrasil.cnpj);
  const cpf = onlyDigits(cert.icpBrasil.cpf);

  if (cnpj.length === 14) {
    return (
      cert.icpBrasil.razaoSocial?.trim() ||
      formatCnpj(cnpj) ||
      cert.displayName ||
      cert.subject
    );
  }

  if (cpf.length === 11) {
    return (
      cert.icpBrasil.responsavel?.trim() ||
      formatCpf(cpf) ||
      cert.displayName ||
      cert.subject
    );
  }

  return cert.displayName || cert.subject;
}

export function getCertificateSummary(cert: LoadedCertificate): string {
  const parts: string[] = [];
  const cnpj = onlyDigits(cert.icpBrasil.cnpj);
  const cpf = onlyDigits(cert.icpBrasil.cpf);
  const holder = getCertificateHolderLabel(cert);

  if (cnpj.length === 14) {
    parts.push(`CNPJ ${formatCnpj(cnpj)}`);
    if (cert.icpBrasil.responsavel?.trim() && cert.icpBrasil.responsavel.trim() !== holder) {
      parts.push(`Responsável ${cert.icpBrasil.responsavel.trim()}`);
    }
    return parts.join(" · ");
  }

  if (cpf.length === 11) {
    parts.push(`CPF ${formatCpf(cpf)}`);
    return parts.join(" · ");
  }

  return holder;
}
