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
import { confirmarLoteIpecc } from "@/lib/documentos/signing/batchSignService";
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
      password?: string;
      otpCode?: string;
      challengeId?: string;
      consentAccepted?: boolean;
      cpf?: string;
      cargo?: string;
      timezone?: string;
      screenResolution?: string;
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
        xPct?: number;
        yPct?: number;
      };
    };
    const meta = requestAuditMeta(req);
    const rate = checkRateLimit(
      assinaturaRateKey("lote-confirmar", auth.userId, meta.ip),
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
      body.placement?.posicao ||
      body.placement?.zona ||
      body.placement?.xPct != null ||
      body.placement?.yPct != null
        ? {
            modoPagina: body.placement.modoPagina || "ultima",
            pagina: body.placement.pagina,
            posicao: body.placement.posicao || "direita",
            zona: body.placement.zona || "rodape",
            xPct:
              typeof body.placement.xPct === "number"
                ? body.placement.xPct
                : undefined,
            yPct:
              typeof body.placement.yPct === "number"
                ? body.placement.yPct
                : undefined,
          }
        : undefined;
    const result = await confirmarLoteIpecc({
      batchId: id,
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
      progressDone: result.progressDone,
      progressTotal: result.progressTotal,
      falhas: result.falhas,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao confirmar lote IPECC.",
      },
      { status: 500 }
    );
  }
}
