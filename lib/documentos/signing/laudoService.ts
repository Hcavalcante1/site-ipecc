import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  EVIDENCE_SELECT,
  type GdSignatureEvidence,
  validationBaseUrl,
} from "./constants";

export type EvidenciaListaItem = Pick<
  GdSignatureEvidence,
  | "id"
  | "document_id"
  | "signature_document_id"
  | "nome"
  | "email"
  | "cpf"
  | "cargo"
  | "signed_at"
  | "validation_code"
  | "signature_serial"
  | "ip"
  | "os"
  | "browser"
  | "document_hash_sha256"
  | "signed_hash_sha256"
  | "created_at"
> & { processo_id?: string | null };

const LISTA_SELECT =
  "id, document_id, signature_document_id, nome, email, cpf, cargo, signed_at, validation_code, signature_serial, ip, os, browser, document_hash_sha256, signed_hash_sha256, created_at";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export async function listarEvidenciasAssinatura(opts?: {
  limit?: number;
  documentId?: string;
}): Promise<
  | { ok: true; evidencias: EvidenciaListaItem[]; aviso?: string }
  | { ok: false; error: string }
> {
  const admin = getSupabaseAdmin();
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);

  let query = admin
    .from("gd_signature_evidences")
    .select(LISTA_SELECT)
    .order("signed_at", { ascending: false })
    .limit(limit);

  if (opts?.documentId) {
    query = query.eq("document_id", opts.documentId);
  }

  const { data, error } = await query;
  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        ok: true,
        evidencias: [],
        aviso:
          "Tabelas de evidência ausentes. Aplique docs/sql/gestao-documental-assinatura-ipecc.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  const rows = (data || []) as EvidenciaListaItem[];
  const docIds = Array.from(
    new Set(rows.map((r) => r.document_id).filter(Boolean))
  );

  const processoByDoc = new Map<string, string | null>();
  if (docIds.length > 0) {
    const { data: docs } = await admin
      .from("gd_documents")
      .select("id, processo_id")
      .in("id", docIds);
    for (const d of docs || []) {
      processoByDoc.set(d.id, d.processo_id ?? null);
    }
  }

  return {
    ok: true,
    evidencias: rows.map((r) => ({
      ...r,
      processo_id: processoByDoc.get(r.document_id) ?? null,
    })),
  };
}

export async function buscarEvidenciaPorId(
  id: string
): Promise<
  | { ok: true; evidence: GdSignatureEvidence }
  | { ok: false; error: string; status: number }
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_signature_evidences")
    .select(EVIDENCE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        ok: false,
        error: "Tabela de evidências ausente.",
        status: 503,
      };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Evidência não encontrada.", status: 404 };
  }
  return { ok: true, evidence: data as GdSignatureEvidence };
}

function authMethodsLabel(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map(String).join(", ");
  if (typeof raw === "string") return raw;
  return "password, email_otp";
}

/** Laudo textual legível (PT-BR) para auditoria / download. */
export function gerarLaudoTexto(evidence: GdSignatureEvidence): string {
  const base = validationBaseUrl();
  const url = `${base}/validar/${evidence.validation_code}`;
  const lines = [
    "LAUDO DE ASSINATURA ELETRÔNICA IPECC",
    "====================================",
    "",
    `Código de validação: ${evidence.validation_code}`,
    `URL de verificação: ${url}`,
    `Serial da assinatura: ${evidence.signature_serial}`,
    `ID da evidência: ${evidence.id}`,
    "",
    "SIGNATÁRIO",
    `  Nome: ${evidence.nome}`,
    `  E-mail: ${evidence.email}`,
    `  CPF: ${evidence.cpf || "(não informado)"}`,
    `  Cargo: ${evidence.cargo || "(não informado)"}`,
    `  User ID: ${evidence.user_id}`,
    "",
    "DOCUMENTO",
    `  Document ID: ${evidence.document_id}`,
    `  Pedido de assinatura: ${evidence.signature_document_id}`,
    `  Versão: ${evidence.version_id || "(n/a)"}`,
    `  Hash original (SHA-256): ${evidence.document_hash_sha256}`,
    `  Hash assinado (SHA-256): ${evidence.signed_hash_sha256}`,
    `  Arquivo assinado: ${evidence.signed_storage_path}`,
    "",
    "TEMPO E LOCAL",
    `  Assinado em: ${evidence.signed_at}`,
    `  Fuso: ${evidence.timezone}`,
    `  IP: ${evidence.ip || "(n/a)"}`,
    `  SO: ${evidence.os || "(n/a)"}`,
    `  Navegador: ${evidence.browser || "(n/a)"}`,
    `  Resolução: ${evidence.screen_resolution || "(n/a)"}`,
    `  User-Agent: ${evidence.user_agent || "(n/a)"}`,
    "",
    "CONSENTIMENTO E AUTENTICAÇÃO",
    `  Texto: ${evidence.consent_text}`,
    `  Aceito em: ${evidence.consent_accepted_at}`,
    `  Métodos: ${authMethodsLabel(evidence.auth_methods)}`,
    `  OTP challenge: ${evidence.otp_challenge_id || "(n/a)"}`,
    "",
    `Gerado em: ${new Date().toISOString()}`,
    "Este laudo resume a evidência append-only registrada no IPECC.",
    "A verificação pública confirma código, hashes e data da assinatura.",
  ];
  return lines.join("\n");
}

/** Laudo em CSV (uma linha de dados). */
export function gerarLaudoCsv(evidence: GdSignatureEvidence): string {
  const header = [
    "id",
    "validation_code",
    "signature_serial",
    "nome",
    "email",
    "cpf",
    "cargo",
    "signed_at",
    "timezone",
    "ip",
    "os",
    "browser",
    "document_id",
    "signature_document_id",
    "document_hash_sha256",
    "signed_hash_sha256",
    "signed_storage_path",
    "consent_accepted_at",
    "auth_methods",
  ];
  const row = [
    evidence.id,
    evidence.validation_code,
    String(evidence.signature_serial),
    evidence.nome,
    evidence.email,
    evidence.cpf || "",
    evidence.cargo || "",
    evidence.signed_at,
    evidence.timezone,
    evidence.ip || "",
    evidence.os || "",
    evidence.browser || "",
    evidence.document_id,
    evidence.signature_document_id,
    evidence.document_hash_sha256,
    evidence.signed_hash_sha256,
    evidence.signed_storage_path,
    evidence.consent_accepted_at,
    authMethodsLabel(evidence.auth_methods),
  ].map(csvEscape);

  return `${header.join(";")}\n${row.join(";")}\n`;
}

function csvEscape(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
