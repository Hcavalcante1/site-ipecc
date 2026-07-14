import { NextRequest, NextResponse } from "next/server";
import { obterValidacaoPublica } from "@/lib/documentos/signing/validationService";
import { requestAuditMeta } from "@/lib/documentos/auditMeta";
import {
  RATE_VALIDAR_PUBLICO,
  checkRateLimit,
  mensagemRateLimit,
  validarPublicoRateKey,
} from "@/lib/documentos/signing/rateLimit";

export const dynamic = "force-dynamic";

type Ctx = { params: { codigo: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const meta = requestAuditMeta(req);
  const rate = checkRateLimit(
    validarPublicoRateKey(meta.ip),
    RATE_VALIDAR_PUBLICO
  );
  if (rate.limited) {
    return NextResponse.json(
      { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
      { status: 429 }
    );
  }

  const resultado = await obterValidacaoPublica({
    codigo: params.codigo,
    ip: meta.ip,
    userAgent: meta.user_agent,
  });

  return NextResponse.json({
    ok: true,
    ...resultado,
  });
}
