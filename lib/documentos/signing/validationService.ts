import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import {
  buscarEvidenciaPorCodigo,
  registrarConsultaValidacao,
  sha256Bytes,
} from "./evidenceService";
import type { GdSignatureEvidence } from "./constants";
import { verificarTransacaoAvancada } from "@/lib/documentos/assinaturas/advanced/advancedSignService";
import { verificarTransacaoCertificado } from "@/lib/documentos/assinaturas/certificate/certificateSignService";

function mascararEmailPublico(email: string | null | undefined): string {
  const raw = String(email || "").trim().toLowerCase();
  const at = raw.indexOf("@");
  if (at < 1) return "—";
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}

export type ValidacaoPublicaResultado = {
  encontrado: boolean;
  modalidade: "SIMPLE" | "ADVANCED" | "CERTIFICATE" | null;
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
  avancada?: {
    status: string;
    identityLevel?: string | null;
    completedAt?: string | null;
  } | null;
  certificado?: {
    subject?: string | null;
    issuer?: string | null;
    thumbprint?: string | null;
    appearancePage?: number | null;
  } | null;
};

export async function obterValidacaoPublica(opts: {
  codigo: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ValidacaoPublicaResultado> {
  const code = String(opts.codigo || "")
    .trim()
    .toUpperCase();

  // 1) Assinatura avançada (tabela própria; não mistura com simples)
  try {
    const adv = await verificarTransacaoAvancada({ verificationCode: code });
    if (adv.found) {
      await registrarConsultaValidacao({
        validationCode: code || "vazio",
        found: true,
        ip: opts.ip,
        userAgent: opts.userAgent,
      });
      const tx = adv.transaction || {};
      const admin = getSupabaseAdmin();
      const docId = String(tx.document_id || "");
      const { data: doc } = docId
        ? await admin
            .from("gd_documents")
            .select("id, title, current_version")
            .eq("id", docId)
            .maybeSingle()
        : { data: null };

      const ok = adv.status === "VALID";
      return {
        encontrado: true,
        modalidade: "ADVANCED",
        evidencia: {
          validation_code: code,
          nome: "Signatário verificado",
          cargo: null,
          email: "—",
          signed_at: String(tx.completed_at || ""),
          timezone: "UTC",
          document_hash_sha256: String(tx.document_hash_sha256 || ""),
          signed_hash_sha256: String(tx.final_document_hash_sha256 || ""),
          signature_serial: 1,
          document_id: docId,
        },
        documento: doc
          ? {
              id: doc.id,
              title: doc.title,
              current_version: doc.current_version,
            }
          : null,
        integridade: {
          ok,
          detalhe: adv.detail || adv.status,
        },
        downloadUrl: ok ? `/api/download/assinatura/${code}` : null,
        avancada: {
          status: adv.status,
          identityLevel: tx.identity_level
            ? String(tx.identity_level)
            : null,
          completedAt: tx.completed_at ? String(tx.completed_at) : null,
        },
        certificado: null,
      };
    }
  } catch {
    // Tabelas avançadas podem ainda não existir — segue.
  }

  // 1b) Assinatura com certificado digital (PFX no cliente)
  try {
    const cert = await verificarTransacaoCertificado({ verificationCode: code });
    if (cert.found) {
      await registrarConsultaValidacao({
        validationCode: code || "vazio",
        found: true,
        ip: opts.ip,
        userAgent: opts.userAgent,
      });
      const tx = cert.transaction || {};
      const admin = getSupabaseAdmin();
      const docId = String(tx.document_id || "");
      const { data: doc } = docId
        ? await admin
            .from("gd_documents")
            .select("id, title, current_version")
            .eq("id", docId)
            .maybeSingle()
        : { data: null };

      return {
        encontrado: true,
        modalidade: "CERTIFICATE",
        evidencia: {
          validation_code: code,
          nome: String(tx.cert_subject || "Signatário com certificado"),
          cargo: null,
          email: "—",
          signed_at: String(tx.completed_at || ""),
          timezone: "UTC",
          document_hash_sha256: String(tx.document_hash_sha256 || ""),
          signed_hash_sha256: String(tx.final_document_hash_sha256 || ""),
          signature_serial: 1,
          document_id: docId,
        },
        documento: doc
          ? {
              id: doc.id,
              title: doc.title,
              current_version: doc.current_version,
            }
          : null,
        integridade: {
          ok: cert.integridadeOk,
          detalhe: cert.detalhe,
        },
        downloadUrl: cert.integridadeOk
          ? `/api/download/assinatura/${code}`
          : null,
        avancada: null,
        certificado: {
          subject: tx.cert_subject ? String(tx.cert_subject) : null,
          issuer: tx.cert_issuer ? String(tx.cert_issuer) : null,
          thumbprint: tx.cert_thumbprint_sha256
            ? String(tx.cert_thumbprint_sha256)
            : null,
          appearancePage:
            typeof tx.appearance_page === "number" ? tx.appearance_page : null,
        },
      };
    }
  } catch {
    // Tabelas certificado podem ainda não existir — segue para simples.
  }

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
      modalidade: null,
      evidencia: null,
      documento: null,
      integridade: null,
      downloadUrl: null,
      avancada: null,
      certificado: null,
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
    modalidade: "SIMPLE",
    evidencia: {
      validation_code: evidencia.validation_code,
      nome: evidencia.nome,
      cargo: evidencia.cargo,
      email: mascararEmailPublico(evidencia.email),
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
    avancada: null,
    certificado: null,
  };
}
