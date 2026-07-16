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
  const parts: string[] = [];
  const subject = cert.subject?.trim();
  const razaoSocial = cert.icpBrasil.razaoSocial?.trim();
  const responsavel = cert.icpBrasil.responsavel?.trim();
  const cnpj = formatCnpj(onlyDigits(cert.icpBrasil.cnpj));
  const cpf = formatCpf(onlyDigits(cert.icpBrasil.cpf));

  if (subject) parts.push(`CN ${subject}`);
  if (razaoSocial) parts.push(`Razão social ${razaoSocial}`);
  if (cnpj) parts.push(`CNPJ ${cnpj}`);
  if (responsavel) parts.push(`Responsável ${responsavel}`);
  if (cpf) parts.push(`CPF ${cpf}`);

  return parts.join(" · ") || cert.displayName || "";
}

export function getCertificateSummary(cert: LoadedCertificate): string {
  return getCertificateHolderLabel(cert);
}
