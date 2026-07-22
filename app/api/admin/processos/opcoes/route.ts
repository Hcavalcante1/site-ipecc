import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { processoIdsDoEscopo, isMestre } from "@/lib/auth/adminEscopo";

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const admin = getSupabaseAdmin();
    const ids = processoIdsDoEscopo(auth.contexto);

    let query = admin
      .from("processos_contratacao")
      .select("id, titulo")
      .eq("status", "ativo")
      .order("titulo", { ascending: true });

    if (ids !== "todos") {
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, processos: [] });
      }
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, processos: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar processos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
