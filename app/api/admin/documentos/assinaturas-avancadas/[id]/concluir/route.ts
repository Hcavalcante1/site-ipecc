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
import { concluirTransacaoAvancada } from "@/lib/documentos/assinaturas/advanced/advancedSignService";
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
      { ok: false, error: "Apenas o signatário pode concluir." },
      { status: 403 }
    );
  }
  const loaded = await carregarDocumentoNoEscopo(tx.document_id, auth);
  if (loaded.error) return loaded.error;

  try {
    const body = (await req.json()) as {
      nome?: string;
      cpf?: string;
      cargo?: string;
      timezone?: string;
      placement?: {
        modoPagina?: "ultima" | "numero" | "nova";
        pagina?: number;
        posicao?: "esquerda" | "centro" | "direita";
        zona?: "topo" | "meio" | "rodape";
        xPct?: number;
        yPct?: number;
      };
    };
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("adv-concluir", auth.userId, meta.ip),
      RATE_ASSINATURA
    );
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: mensagemRateLimit(rate.retryAfterSec) },
        { status: 429 }
      );
    }

    const placement =
      body.placement?.modoPagina ||
      body.placement?.xPct != null ||
      body.placement?.yPct != null
        ? {
            modoPagina: body.placement.modoPagina || "ultima",
            pagina: body.placement.pagina,
            posicao: body.placement.posicao || "direita",
            zona: body.placement.zona || "rodape",
            xPct: body.placement.xPct,
            yPct: body.placement.yPct,
          }
        : undefined;

    const result = await concluirTransacaoAvancada({
      transactionId: ctx.params.id,
      signerUserId: auth.userId,
      actorName: String(body.nome || "").trim(),
      cpf: String(body.cpf || ""),
      cargo: body.cargo || null,
      placement,
      client: {
        ip: meta.ip,
        userAgent: meta.user_agent,
        timezone: body.timezone,
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
      validationCode: result.verificationCode,
      signedHash: result.signedHash,
      transactionId: result.transactionId,
      disclaimer:
        "Assinatura eletrônica avançada IPECC. Não equivale a assinatura qualificada ICP-Brasil.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao concluir.",
      },
      { status: 500 }
    );
  }
}
