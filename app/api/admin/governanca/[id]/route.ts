import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
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
