import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import {
  buscarEvidenciaPorCodigo,
  registrarConsultaValidacao,
  sha256Bytes,
} from "./evidenceService";
import type { GdSignatureEvidence } from "./constants";

export type ValidacaoPublicaResultado = {
  encontrado: boolean;
  evidencia: Pick<
    GdSignatureEvidence,
    | "validation_code"
    | "nome"
    | "cargo"
    | "email"
    | "signed_at"
    | "timezone"
    | "document_hash_sha256"
    | "signed_hash_sha256"
    | "signature_serial"
    | "document_id"
  > | null;
  documento: {
    id: string;
    title: string;
    current_version: number;
  } | null;
  integridade: {
    ok: boolean;
    detalhe: string;
  } | null;
  /** URL curta no domínio IPECC para preview/download. */
  downloadUrl: string | null;
};

export async function obterValidacaoPublica(opts: {
  codigo: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ValidacaoPublicaResultado> {
  const code = String(opts.codigo || "")
    .trim()
    .toUpperCase();

  const { data: evidencia } = await buscarEvidenciaPorCodigo(code);

  await registrarConsultaValidacao({
    validationCode: code || "vazio",
    found: Boolean(evidencia),
    ip: opts.ip,
    userAgent: opts.userAgent,
  });

  if (!evidencia) {
    return {
      encontrado: false,
      evidencia: null,
      documento: null,
      integridade: null,
      downloadUrl: null,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: doc } = await admin
    .from("gd_documents")
    .select("id, title, current_version")
    .eq("id", evidencia.document_id)
    .maybeSingle();

  let integridade: ValidacaoPublicaResultado["integridade"] = {
    ok: false,
    detalhe: "Arquivo assinado indisponível.",
  };
  // Link curto no domínio IPECC (mesmo padrão dos downloads públicos)
  let downloadUrl: string | null = `/api/download/assinatura/${evidencia.validation_code}`;

  try {
    const { data: file } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .download(evidencia.signed_storage_path);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const hash = sha256Bytes(buf);
      const ok = hash === evidencia.signed_hash_sha256;
      integridade = {
        ok,
        detalhe: ok
          ? "Hash SHA-256 confere com a evidência registrada."
          : "Hash do arquivo divergente da evidência.",
      };
    } else {
      downloadUrl = null;
    }
  } catch (e) {
    downloadUrl = null;
    integridade = {
      ok: false,
      detalhe: e instanceof Error ? e.message : "Falha ao verificar integridade.",
    };
  }

  return {
    encontrado: true,
    evidencia: {
      validation_code: evidencia.validation_code,
      nome: evidencia.nome,
      cargo: evidencia.cargo,
      email: evidencia.email,
      signed_at: evidencia.signed_at,
      timezone: evidencia.timezone,
      document_hash_sha256: evidencia.document_hash_sha256,
      signed_hash_sha256: evidencia.signed_hash_sha256,
      signature_serial: evidencia.signature_serial,
      document_id: evidencia.document_id,
    },
    documento: doc
      ? {
          id: doc.id,
          title: doc.title,
          current_version: doc.current_version,
        }
      : null,
    integridade,
    downloadUrl,
  };
}
