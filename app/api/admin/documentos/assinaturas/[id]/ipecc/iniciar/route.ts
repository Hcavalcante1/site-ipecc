import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import { carregarPedidoAssinaturaNoEscopo } from "@/lib/documentos/scopeHelper";
import { iniciarAssinaturaIpecc } from "@/lib/documentos/signing/ipeccSignService";
import {
  RATE_ASSINATURA,
  assinaturaRateKey,
  checkRateLimit,
  mensagemRateLimit,
} from "@/lib/documentos/signing/rateLimit";

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = ctx.params.id;
  const scoped = await carregarPedidoAssinaturaNoEscopo(id, auth);
  if (scoped.error) return scoped.error;

  try {
    const body = (await req.json()) as {
      consentAccepted?: boolean;
      timezone?: string;
      screenResolution?: string;
      os?: string;
      browser?: string;
    };
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("iniciar", auth.userId, meta.ip),
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
        { ok: false, error: "E-mail do usuário autenticado ausente." },
        { status: 400 }
      );
    }

    const result = await iniciarAssinaturaIpecc({
      signatureDocumentId: id,
      userId: auth.userId,
      actorEmail: email,
      consentAccepted: Boolean(body.consentAccepted),
      client: {
        ip: meta.ip,
        userAgent: meta.user_agent,
        timezone: body.timezone,
        screenResolution: body.screenResolution,
        os: body.os,
        browser: body.browser,
      },
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: typeof result.status === "number" ? result.status : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      consentText: result.consentText,
      ...(result.devCode ? { devCode: result.devCode } : {}),
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao iniciar assinatura.",
      },
      { status: 500 }
    );
  }
}
