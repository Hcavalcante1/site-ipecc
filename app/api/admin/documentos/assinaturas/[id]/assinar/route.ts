import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos, requestAuditMeta } from "@/lib/documentos";
import { executarAssinaturaComToken } from "@/lib/documentos/signatureService";

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = ctx.params.id;
  try {
    const body = (await req.json()) as { state?: string };
    const state = String(body.state || "").trim();
    if (!state) {
      return NextResponse.json(
        { ok: false, error: "state OAuth é obrigatório." },
        { status: 400 }
      );
    }

    const meta = requestAuditMeta(req);
    const result = await executarAssinaturaComToken({
      signatureDocumentId: id,
      state,
      userId: auth.userId,
      actorEmail: auth.contexto.email,
      ip: meta.ip,
      userAgent: meta.user_agent,
    });

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, signature: result.data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao assinar.",
      },
      { status: 500 }
    );
  }
}
