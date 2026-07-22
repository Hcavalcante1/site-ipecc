import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import {
  RATE_ASSINATURA,
  RATE_OTP,
  assinaturaRateKey,
  checkRateLimit,
  mensagemRateLimit,
} from "@/lib/documentos/signing/rateLimit";
import {
  aceitarConsentimentoLoteAvancado,
  autorizarLoteAvancado,
  concluirLoteAvancado,
  iniciarMfaLoteAvancado,
} from "@/lib/documentos/assinaturas/advanced/batchAdvancedService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: { id: string } };

async function assertBatchOwner(
  batchId: string,
  userId: string
): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("gd_adv_batches")
    .select("id, created_by")
    .eq("id", batchId)
    .maybeSingle();
  if (!data) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Lote não encontrado." },
        { status: 404 }
      ),
    };
  }
  if (data.created_by !== userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Apenas o signatário do lote." },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

/** POST body.action = consentimento | mfa | autorizar | concluir */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const owned = await assertBatchOwner(ctx.params.id, auth.userId);
  if (owned.ok === false) return owned.response;

  try {
    const body = (await req.json()) as {
      action?: string;
      consentAccepted?: boolean;
      documentViewed?: boolean;
      listAcknowledged?: boolean;
      sessionId?: string;
      password?: string;
      otpCode?: string;
      challengeId?: string;
      nome?: string;
      cpf?: string;
      cargo?: string;
      timezone?: string;
    };

    const action = String(body.action || "").trim();
    const meta = requestAuditMeta(req);
    const email = String(auth.contexto.email || "").trim();

    if (action === "consentimento") {
      const rate = await checkRateLimit(
        assinaturaRateKey("adv-consent", auth.userId, meta.ip),
        RATE_ASSINATURA
      );
      if (rate.limited) {
        return NextResponse.json(
          { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
          { status: 429 }
        );
      }
      const result = await aceitarConsentimentoLoteAvancado({
        batchId: ctx.params.id,
        signerUserId: auth.userId,
        consentAccepted: Boolean(body.consentAccepted),
        documentViewed: Boolean(body.documentViewed),
        listAcknowledged: Boolean(body.listAcknowledged),
        sessionId: body.sessionId || null,
        client: { ip: meta.ip, userAgent: meta.user_agent },
      });
      if (result.ok === false) {
        return NextResponse.json(
          { ok: false, error: result.error },
          {
            status:
              typeof result.status === "number" ? result.status : 400,
          }
        );
      }
      return NextResponse.json({ ok: true, consentId: result.consentId });
    }

    if (action === "mfa") {
      if (!email) {
        return NextResponse.json(
          { ok: false, error: "E-mail ausente." },
          { status: 400 }
        );
      }
      const rate = await checkRateLimit(
        assinaturaRateKey("adv-mfa", auth.userId, meta.ip),
        RATE_OTP
      );
      if (rate.limited) {
        return NextResponse.json(
          { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
          { status: 429 }
        );
      }
      const result = await iniciarMfaLoteAvancado({
        batchId: ctx.params.id,
        signerUserId: auth.userId,
        actorEmail: email,
        client: { ip: meta.ip, userAgent: meta.user_agent },
      });
      if (result.ok === false) {
        return NextResponse.json(
          { ok: false, error: result.error },
          {
            status:
              typeof result.status === "number" ? result.status : 400,
          }
        );
      }
      return NextResponse.json({
        ok: true,
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        ...(result.devCode ? { devCode: result.devCode } : {}),
        ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
      });
    }

    if (action === "autorizar") {
      if (!email) {
        return NextResponse.json(
          { ok: false, error: "E-mail ausente." },
          { status: 400 }
        );
      }
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
      const result = await autorizarLoteAvancado({
        batchId: ctx.params.id,
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
          {
            status:
              typeof result.status === "number" ? result.status : 400,
          }
        );
      }
      return NextResponse.json({ ok: true, status: "AUTHORIZED" });
    }

    if (action === "concluir") {
      const rate = await checkRateLimit(
        assinaturaRateKey("adv-concluir", auth.userId, meta.ip),
        RATE_ASSINATURA
      );
      if (rate.limited) {
        return NextResponse.json(
          { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
          { status: 429 }
        );
      }
      const result = await concluirLoteAvancado({
        batchId: ctx.params.id,
        signerUserId: auth.userId,
        actorName: String(body.nome || "").trim(),
        cpf: String(body.cpf || ""),
        cargo: body.cargo || null,
        client: {
          ip: meta.ip,
          userAgent: meta.user_agent,
          timezone: body.timezone,
        },
      });
      if (result.ok === false) {
        return NextResponse.json(
          { ok: false, error: result.error },
          {
            status:
              typeof result.status === "number" ? result.status : 400,
          }
        );
      }
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "action inválida (consentimento|mfa|autorizar|concluir).",
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro no lote avançado.",
      },
      { status: 500 }
    );
  }
}
