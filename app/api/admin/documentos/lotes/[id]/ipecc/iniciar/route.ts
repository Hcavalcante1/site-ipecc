import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";
import { BATCH_SELECT } from "@/lib/documentos/signatureService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { iniciarLoteIpecc } from "@/lib/documentos/signing/batchSignService";
import {
  RATE_ASSINATURA,
  assinaturaRateKey,
  checkRateLimit,
  mensagemRateLimit,
} from "@/lib/documentos/signing/rateLimit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_signature_batches")
    .select(BATCH_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json(
      { ok: false, error: "Lote não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(batch.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Lote fora do seu escopo." },
      { status: 403 }
    );
  }

  const email = String(auth.contexto.email || "").trim();
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "E-mail do usuário autenticado ausente." },
      { status: 400 }
    );
  }

  try {
    const body = (await req.json()) as {
      consentAccepted?: boolean;
      timezone?: string;
      screenResolution?: string;
    };
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("lote-iniciar", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }
    const result = await iniciarLoteIpecc({
      batchId: id,
      userId: auth.userId,
      actorEmail: email,
      consentAccepted: Boolean(body.consentAccepted),
      client: {
        ip: meta.ip,
        userAgent: meta.user_agent,
        timezone: body.timezone,
        screenResolution: body.screenResolution,
      },
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      consentText: result.consentText,
      total: result.total,
      ...(result.devCode ? { devCode: result.devCode } : {}),
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao iniciar lote IPECC.",
      },
      { status: 500 }
    );
  }
}
