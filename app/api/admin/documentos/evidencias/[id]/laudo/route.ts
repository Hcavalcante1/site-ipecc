import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buscarEvidenciaPorId,
  gerarLaudoCsv,
  gerarLaudoTexto,
} from "@/lib/documentos/signing/laudoService";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = ctx.params.id;
  const format = String(req.nextUrl.searchParams.get("format") || "txt")
    .trim()
    .toLowerCase();

  const result = await buscarEvidenciaPorId(id);
  if (result.ok === false) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: doc } = await admin
    .from("gd_documents")
    .select("id, processo_id")
    .eq("id", result.evidence.document_id)
    .maybeSingle();

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(doc?.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Evidência fora do seu escopo." },
      { status: 403 }
    );
  }

  const code = result.evidence.validation_code;
  if (format === "csv") {
    const body = gerarLaudoCsv(result.evidence);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laudo-assinatura-${code}.csv"`,
      },
    });
  }

  const body = gerarLaudoTexto(result.evidence);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="laudo-assinatura-${code}.txt"`,
    },
  });
}
