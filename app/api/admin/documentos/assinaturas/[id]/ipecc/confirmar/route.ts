import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import { confirmarAssinaturaIpecc } from "@/lib/documentos/signing/ipeccSignService";
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
  try {
    const body = (await req.json()) as {
      password?: string;
      otpCode?: string;
      challengeId?: string;
      consentAccepted?: boolean;
      cpf?: string;
      cargo?: string;
      timezone?: string;
      screenResolution?: string;
      os?: string;
      browser?: string;
      nome?: string;
      placement?: {
        modoPagina?: "ultima" | "numero" | "nova";
        pagina?: number;
        posicao?:
          | "esquerda"
          | "centro"
          | "direita"
          | "rodape_esquerda"
          | "rodape_centro"
          | "rodape_direita";
        zona?: "topo" | "meio" | "rodape";
      };
    };

    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("confirmar", auth.userId, meta.ip),
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

    const placement =
      body.placement?.modoPagina ||
      body.placement?.posicao ||
      body.placement?.zona
        ? {
            modoPagina: body.placement.modoPagina || "ultima",
            pagina: body.placement.pagina,
            posicao: body.placement.posicao || "direita",
            zona: body.placement.zona || "rodape",
          }
        : undefined;

    const result = await confirmarAssinaturaIpecc({
      signatureDocumentId: id,
      userId: auth.userId,
      actorEmail: email,
      actorName: body.nome || null,
      password: String(body.password || ""),
      otpCode: String(body.otpCode || ""),
      challengeId: String(body.challengeId || ""),
      consentAccepted: Boolean(body.consentAccepted),
      cpf: body.cpf || null,
      cargo: body.cargo || null,
      placement,
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
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      validationCode: result.validationCode,
      signedHash: result.signedHash,
      evidenceId: result.evidenceId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao confirmar assinatura.",
      },
      { status: 500 }
    );
  }
}
