import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  requestAuditMeta,
} from "@/lib/documentos";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";
import {
  RATE_ASSINATURA,
  assinaturaRateKey,
  checkRateLimit,
  mensagemRateLimit,
} from "@/lib/documentos/signing/rateLimit";
import { criarTransacaoAvancada } from "@/lib/documentos/assinaturas/advanced/advancedSignService";

/** POST /api/admin/documentos/assinaturas-avancadas — cria transação avançada */
export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      documentId?: string;
      idempotencyKey?: string;
    };
    const documentId = String(body.documentId || "").trim();
    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: "documentId obrigatório." },
        { status: 400 }
      );
    }

    const loaded = await carregarDocumentoNoEscopo(documentId, auth);
    if (loaded.error) return loaded.error;

    const meta = requestAuditMeta(req);
    const rate = await checkRateLimit(
      assinaturaRateKey("adv-criar", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }

    const result = await criarTransacaoAvancada({
      documentId,
      signerUserId: auth.userId,
      actorUserId: auth.userId,
      processoId: loaded.data.processo_id,
      idempotencyKey: body.idempotencyKey || null,
      client: { ip: meta.ip, userAgent: meta.user_agent },
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: typeof result.status === "number" ? result.status : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      transactionId: result.transactionId,
      documentHashSha256: result.documentHashSha256,
      consentText: result.consentText,
      status: result.status,
      disclaimer:
        "Assinatura eletrônica avançada IPECC. Não equivale a assinatura qualificada ICP-Brasil.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao criar transação avançada.",
      },
      { status: 500 }
    );
  }
}
