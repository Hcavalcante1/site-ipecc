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
import { autorizarTransacaoAvancada } from "@/lib/documentos/assinaturas/advanced/advancedSignService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select("id, document_id, signer_user_id")
    .eq("id", ctx.params.id)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json(
      { ok: false, error: "Transação não encontrada." },
      { status: 404 }
    );
  }
  if (tx.signer_user_id !== auth.userId) {
    return NextResponse.json(
      { ok: false, error: "Apenas o signatário pode autorizar." },
      { status: 403 }
    );
  }
  const loaded = await carregarDocumentoNoEscopo(tx.document_id, auth);
  if (loaded.error) return loaded.error;

  try {
    const body = (await req.json()) as {
      password?: string;
      otpCode?: string;
      challengeId?: string;
    };
    const meta = requestAuditMeta(req);
    const rate = await checkRateLimit(
      assinaturaRateKey("adv-auth", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }
    const email = String(auth.contexto.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-mail do usuário ausente." },
        { status: 400 }
      );
    }

    const result = await autorizarTransacaoAvancada({
      transactionId: ctx.params.id,
      signerUserId: auth.userId,
      actorEmail: email,
      password: String(body.password || ""),
      otpCode: String(body.otpCode || ""),
      challengeId: String(body.challengeId || ""),
      client: { ip: meta.ip, userAgent: meta.user_agent },
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: typeof result.status === "number" ? result.status : 400 }
      );
    }
    return NextResponse.json({ ok: true, status: "AUTHORIZED" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao autorizar.",
      },
      { status: 500 }
    );
  }
}
