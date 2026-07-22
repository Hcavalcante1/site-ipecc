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
import {
  criarLoteAvancado,
  listarLotesAvancados,
} from "@/lib/documentos/assinaturas/advanced/batchAdvancedService";

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const result = await listarLotesAvancados({ signerUserId: auth.userId });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, batches: [] },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, batches: result.batches });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as { documentIds?: string[] };
    const documentIds = Array.isArray(body.documentIds) ? body.documentIds : [];
    if (!documentIds.length) {
      return NextResponse.json(
        { ok: false, error: "documentIds obrigatório." },
        { status: 400 }
      );
    }

    let processoId: string | null = null;
    for (const id of documentIds) {
      const loaded = await carregarDocumentoNoEscopo(String(id), auth);
      if (loaded.error) return loaded.error;
      if (!processoId) processoId = loaded.data.processo_id;
    }

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

    const result = await criarLoteAvancado({
      documentIds,
      signerUserId: auth.userId,
      actorUserId: auth.userId,
      processoId,
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
      ...result,
      disclaimer:
        "Lote de Assinatura Eletrônica Avançada IPECC. Não equivale a ICP-Brasil.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao criar lote.",
      },
      { status: 500 }
    );
  }
}
