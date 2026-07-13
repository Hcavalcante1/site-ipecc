import { NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { isMestre } from "@/lib/auth/adminEscopo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { providerStatusResumo } from "@/lib/documentos/signatureService";

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const status = await providerStatusResumo();
  return NextResponse.json({ ok: true, ...status });
}

export async function PATCH(req: Request) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  if (!isMestre(auth.contexto)) {
    return NextResponse.json(
      { ok: false, error: "Somente o mestre pode alterar provedores." },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as { code?: string; ativo?: boolean };
    const code = String(body.code || "").trim();
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "code é obrigatório." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("gd_signature_providers")
      .update({
        ativo: Boolean(body.ativo),
        updated_at: new Date().toISOString(),
      })
      .eq("code", code)
      .select("id, code, name, ativo, updated_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, provider: data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao atualizar.",
      },
      { status: 500 }
    );
  }
}
