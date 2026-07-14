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
import { aceitarConsentimentoAvancado } from "@/lib/documentos/assinaturas/advanced/advancedSignService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";

type Ctx = { params: { id: string } };

async function txNoEscopo(transactionId: string, auth: NonNullable<Awaited<ReturnType<typeof denyIfSemModuloDocumentos>>["auth"]>) {
  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select("id, document_id, signer_user_id, status")
    .eq("id", transactionId)
    .maybeSingle();
  if (!tx) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Transação não encontrada." },
        { status: 404 }
      ),
    };
  }
  if (tx.signer_user_id !== auth.userId) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Apenas o signatário pode operar esta transação." },
        { status: 403 }
      ),
    };
  }
  const loaded = await carregarDocumentoNoEscopo(tx.document_id, auth);
  if (loaded.error) return { error: loaded.error };
  return { tx };
}

/** POST .../assinaturas-avancadas/[id]/consentimento */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const scoped = await txNoEscopo(ctx.params.id, auth);
  if (scoped.error) return scoped.error;

  try {
    const body = (await req.json()) as {
      consentAccepted?: boolean;
      documentViewed?: boolean;
      sessionId?: string;
    };
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("adv-consent", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }

    const result = await aceitarConsentimentoAvancado({
      transactionId: ctx.params.id,
      signerUserId: auth.userId,
      consentAccepted: Boolean(body.consentAccepted),
      documentViewed: Boolean(body.documentViewed),
      sessionId: body.sessionId || null,
      client: { ip: meta.ip, userAgent: meta.user_agent },
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: typeof result.status === "number" ? result.status : 400 }
      );
    }
    return NextResponse.json({ ok: true, consentId: result.consentId });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro no consentimento.",
      },
      { status: 500 }
    );
  }
}
