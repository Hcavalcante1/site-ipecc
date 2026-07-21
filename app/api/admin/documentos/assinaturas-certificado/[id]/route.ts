import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import {
  RATE_ASSINATURA,
  assinaturaRateKey,
  checkRateLimit,
  mensagemRateLimit,
} from "@/lib/documentos/signing/rateLimit";
import {
  concluirItemCertificado,
  finalizarLoteCertificado,
} from "@/lib/documentos/assinaturas/certificate/certificateSignService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CERT_DISCLAIMER } from "@/lib/documentos/assinaturas/certificate/constants";

type Ctx = { params: { id: string } };

/**
 * GET — metadados da sessão/lote (sem chave).
 * POST action=concluir | finalizar
 * concluir aceita JSON (legado) ou multipart/form-data (preferencial).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const id = ctx.params.id;

  const { data: batch } = await admin
    .from("gd_cert_batches")
    .select("id, status, item_count, batch_hash_sha256, created_by, created_at")
    .eq("id", id)
    .maybeSingle();

  if (batch) {
    if (batch.created_by !== auth.userId) {
      return NextResponse.json(
        { ok: false, error: "Apenas o signatário do lote." },
        { status: 403 }
      );
    }
    const { data: items } = await admin
      .from("gd_cert_batch_items")
      .select(
        "id, document_id, document_hash_sha256, transaction_id, status, sort_order"
      )
      .eq("batch_id", id)
      .order("sort_order", { ascending: true });
    return NextResponse.json({
      ok: true,
      mode: "batch",
      batch,
      items: items || [],
      disclaimer: CERT_DISCLAIMER,
    });
  }

  const { data: tx } = await admin
    .from("gd_cert_transactions")
    .select(
      "id, document_id, document_hash_sha256, status, signer_user_id, verification_code, original_storage_path"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json(
      { ok: false, error: "Sessão não encontrada." },
      { status: 404 }
    );
  }
  if (tx.signer_user_id !== auth.userId) {
    return NextResponse.json(
      { ok: false, error: "Apenas o signatário." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "single",
    transaction: tx,
    downloadPath: `/api/admin/documentos/assinaturas-certificado/${tx.id}/arquivo`,
    disclaimer: CERT_DISCLAIMER,
  });
}

async function parseConcluirBody(req: NextRequest): Promise<{
  action: string;
  transactionId?: string;
  signedPdfBytes?: Buffer | null;
  signedPdfBase64?: string | null;
  pkcs7Bytes?: Buffer | null;
  pkcs7Base64?: string | null;
  cert?: {
    subject?: string;
    issuer?: string;
    serial?: string;
    notBefore?: string;
    notAfter?: string;
    thumbprintSha256?: string;
  };
  appearance?: {
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const signedFile = form.get("signedPdf");
    const pkcs7File = form.get("pkcs7");
    let signedPdfBytes: Buffer | null = null;
    let pkcs7Bytes: Buffer | null = null;
    if (signedFile && typeof signedFile !== "string") {
      signedPdfBytes = Buffer.from(await signedFile.arrayBuffer());
    }
    if (pkcs7File && typeof pkcs7File !== "string") {
      pkcs7Bytes = Buffer.from(await pkcs7File.arrayBuffer());
    }
    let cert: Record<string, string> | undefined;
    const certRaw = form.get("cert");
    if (typeof certRaw === "string" && certRaw.trim()) {
      try {
        cert = JSON.parse(certRaw) as Record<string, string>;
      } catch {
        cert = undefined;
      }
    }
    let appearance:
      | {
          page?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        }
      | undefined;
    const appRaw = form.get("appearance");
    if (typeof appRaw === "string" && appRaw.trim()) {
      try {
        const parsed = JSON.parse(appRaw) as {
          page?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        };
        appearance = {
          page: parsed.page,
          x: parsed.x,
          y: parsed.y,
          width: parsed.width,
          height: parsed.height,
        };
      } catch {
        appearance = undefined;
      }
    }
    return {
      action: String(form.get("action") || "concluir"),
      transactionId:
        typeof form.get("transactionId") === "string"
          ? String(form.get("transactionId"))
          : undefined,
      signedPdfBytes,
      pkcs7Bytes,
      cert,
      appearance,
    };
  }

  const body = (await req.json()) as {
    action?: string;
    transactionId?: string;
    signedPdfBase64?: string;
    pkcs7Base64?: string;
    cert?: {
      subject?: string;
      issuer?: string;
      serial?: string;
      notBefore?: string;
      notAfter?: string;
      thumbprintSha256?: string;
    };
    appearance?: {
      page?: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
  };
  return {
    action: String(body.action || "").trim(),
    transactionId: body.transactionId,
    signedPdfBase64: body.signedPdfBase64 || null,
    pkcs7Base64: body.pkcs7Base64 || null,
    cert: body.cert,
    appearance: body.appearance,
  };
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = await parseConcluirBody(req);
    const action = String(body.action || "").trim();
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("cert-concluir", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }

    if (action === "finalizar") {
      const result = await finalizarLoteCertificado({
        batchId: ctx.params.id,
        signerUserId: auth.userId,
      });
      if (result.ok === false) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status || 400 }
        );
      }
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "concluir") {
      const txId = String(body.transactionId || ctx.params.id).trim();
      const hasPdf =
        (body.signedPdfBytes && body.signedPdfBytes.length > 0) ||
        Boolean(body.signedPdfBase64);
      if (!hasPdf || !body.cert?.thumbprintSha256) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Envie o PDF assinado e metadados públicos do certificado (thumbprint).",
          },
          { status: 400 }
        );
      }
      const result = await concluirItemCertificado({
        transactionId: txId,
        signerUserId: auth.userId,
        actorUserId: auth.userId,
        signedPdfBytes: body.signedPdfBytes || null,
        signedPdfBase64: body.signedPdfBase64 || null,
        pkcs7Bytes: body.pkcs7Bytes || null,
        pkcs7Base64: body.pkcs7Base64 || null,
        cert: {
          subject: String(body.cert.subject || ""),
          issuer: String(body.cert.issuer || ""),
          serial: String(body.cert.serial || ""),
          notBefore: String(body.cert.notBefore || ""),
          notAfter: String(body.cert.notAfter || ""),
          thumbprintSha256: String(body.cert.thumbprintSha256 || ""),
        },
        appearance: body.appearance
          ? {
              page: Number(body.appearance.page) || 1,
              x: body.appearance.x,
              y: body.appearance.y,
              width: body.appearance.width,
              height: body.appearance.height,
            }
          : null,
        client: { ip: meta.ip, userAgent: meta.user_agent },
      });
      if (result.ok === false) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status || 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        ...result,
        disclaimer: CERT_DISCLAIMER,
      });
    }

    return NextResponse.json(
      { ok: false, error: "action deve ser concluir ou finalizar." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro na sessão de certificado.",
      },
      { status: 500 }
    );
  }
}
