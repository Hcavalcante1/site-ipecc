import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { existeArquivoProposta } from "@/lib/storage/propostasBucket";
import { propostaPermitidaNoModulo } from "@/lib/auth/propostaAccess";
import { extrairPathsAnexoProposta } from "@/lib/documental/propostaPaths";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Prevent pre-rendering during build
export const dynamic = "force-dynamic";

type ItemEntrada = { path: string; label?: string };

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const propostaId = String(body?.proposta_id || "").trim();
    if (!propostaId || !(await propostaPermitidaNoModulo(auth.contexto, propostaId))) return NextResponse.json({ ok: false, error: "Proposta fora do seu escopo." }, { status: 403 });
    const { data: proposta } = await supabaseAdmin.from("propostas").select("*").eq("id", propostaId).maybeSingle();
    const caminhosPermitidos = new Set(proposta ? extrairPathsAnexoProposta(proposta as Record<string, unknown>) : []);
    const { data: refs } = await supabaseAdmin.from("proposta_anexos").select("storage_path").eq("proposta_id", propostaId);
    for (const ref of refs || []) if (ref.storage_path) caminhosPermitidos.add(String(ref.storage_path));
    const itens = (Array.isArray(body?.itens) ? body.itens : []) as ItemEntrada[];

    if (itens.length === 0) {
      return NextResponse.json({ ok: true, resultados: [] });
    }

    if (itens.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Máximo de 50 anexos por verificação" },
        { status: 400 }
      );
    }

    const resultados = await Promise.all(
      itens.map(async (item) => {
        const path = String(item.path || "").trim();
        if (!path) {
          return {
            path,
            label: item.label ?? null,
            exists: false,
            resolvedPath: null,
          };
        }

        if (!caminhosPermitidos.has(path)) return { path, label: item.label ?? null, exists: false, resolvedPath: null };
        const check = await existeArquivoProposta(path);
        return {
          path,
          label: item.label ?? null,
          exists: check.exists,
          resolvedPath: check.exists ? check.resolvedPath : null,
        };
      })
    );

    return NextResponse.json({ ok: true, resultados });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
