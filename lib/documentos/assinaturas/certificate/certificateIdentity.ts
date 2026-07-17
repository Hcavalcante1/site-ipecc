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

function stripSubjectCnpj(subject: string): string {
  return subject.replace(/[:\s-]*\d{14}\s*$/, "").trim();
}

export function getCertificateHolderLabel(cert: LoadedCertificate): string {
  const subject = cert.subject?.trim();
  const cnpj = formatCnpj(onlyDigits(cert.icpBrasil.cnpj));

  if (subject) return stripSubjectCnpj(subject) || subject;
  if (cnpj) return `CNPJ ${cnpj}`;
  return cert.displayName || "";
}

export function getCertificateHolderCnpj(cert: LoadedCertificate): string | null {
  const cnpj = formatCnpj(onlyDigits(cert.icpBrasil.cnpj));
  return cnpj || null;
}

export function getCertificateSummary(cert: LoadedCertificate): string {
  return getCertificateHolderLabel(cert);
}
