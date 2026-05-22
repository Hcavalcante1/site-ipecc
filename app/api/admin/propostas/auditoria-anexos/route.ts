import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { gerarAuditoriaAnexos } from "@/lib/documental/auditoriaAnexos";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { linhas, resumo } = await gerarAuditoriaAnexos(supabaseAdmin);
    return NextResponse.json({ ok: true, linhas, resumo });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
