import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import { criarEEnviarOtp } from "@/lib/documentos/signing/otpService";
import {
  RATE_OTP,
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
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("otp", auth.userId, meta.ip),
      RATE_OTP
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

    const otp = await criarEEnviarOtp({
      signatureDocumentId: id,
      userId: auth.userId,
      email,
      ip: meta.ip,
    });

    if (otp.ok === false) {
      return NextResponse.json(
        { ok: false, error: otp.error },
        { status: otp.status || 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      challengeId: otp.challengeId,
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
      ...(otp.emailWarning ? { emailWarning: otp.emailWarning } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao reenviar OTP.",
      },
      { status: 500 }
    );
  }
}
