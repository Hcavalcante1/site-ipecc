import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { podeAcessarProcesso } from "@/lib/auth/adminEscopo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_req: Request, { params }: Params) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const editalId = params.id;

  const [editalRes, documentosRes, logsRes, propostasRes] = await Promise.all([
    supabaseAdmin.from("editais").select("*").eq("id", editalId).single(),
    supabaseAdmin
      .from("documentos_publicos")
      .select("*")
      .eq("edital_id", editalId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("editais_logs")
      .select("*")
      .eq("edital_id", editalId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("propostas")
      .select("id,nome,email,telefone,cnpj,tipo,categoria,status,criado_em,created_at")
      .eq("edital_id", editalId)
      .order("criado_em", { ascending: false }),
  ]);

  if (editalRes.error) {
    return NextResponse.json(
      { ok: false, error: editalRes.error.message },
      { status: 500 }
    );
  }

  const processoId = (editalRes.data as { processo_id?: string | null } | null)
    ?.processo_id;

  if (!podeAcessarProcesso(auth.contexto, processoId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acesso negado — este edital esta fora do seu escopo de processo.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    edital: editalRes.data,
    documentos: documentosRes.data ?? [],
    logs: logsRes.data ?? [],
    propostas: propostasRes.data ?? [],
    warnings: {
      documentos: documentosRes.error?.message ?? null,
      logs: logsRes.error?.message ?? null,
      propostas: propostasRes.error?.message ?? null,
    },
  });
}
