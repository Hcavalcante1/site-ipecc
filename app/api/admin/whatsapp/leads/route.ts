import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isWhatsAppLeadPersistEnabled } from "@/lib/whatsapp/leadPersist";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const persistenciaAtiva = isWhatsAppLeadPersistEnabled();
  const params = req.nextUrl.searchParams;

  const q       = params.get("q")?.trim() ?? "";
  const assunto = params.get("assunto")?.trim() ?? "";
  const inicio  = params.get("inicio")?.trim() ?? "";
  const fim     = params.get("fim")?.trim() ?? "";
  const limit   = Math.min(Number(params.get("limit") ?? 50), 200);
  const offset  = Math.max(Number(params.get("offset") ?? 0), 0);

  let query = supabaseAdmin
    .from("whatsapp_leads")
    .select("id, created_at, nome, organizacao, telefone, email, assunto, mensagem, pagina_origem", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%,organizacao.ilike.%${q}%`);
  }
  if (assunto) {
    query = query.eq("assunto", assunto);
  }
  if (inicio) {
    query = query.gte("created_at", `${inicio}T00:00:00`);
  }
  if (fim) {
    query = query.lte("created_at", `${fim}T23:59:59`);
  }

  const { data, count, error } = await query;

  if (error) {
    const missing =
      error.message.includes("whatsapp_leads") ||
      error.code === "42P01" ||
      /schema cache/i.test(error.message);
    return NextResponse.json({
      ok: true,
      leads: [],
      total: 0,
      persistenciaAtiva,
      aviso: missing
        ? "Tabela whatsapp_leads ausente. Aplique docs/sql/whatsapp-leads-staging.sql no Supabase."
        : error.message,
    });
  }

  const avisos: string[] = [];
  if (!persistenciaAtiva) {
    avisos.push(
      "Persistência de leads desligada (WHATSAPP_LEADS_PERSIST_SUPABASE≠1). O formulário público ainda abre o WhatsApp, mas não grava no banco."
    );
  }

  return NextResponse.json({
    ok: true,
    leads: data ?? [],
    total: count ?? data?.length ?? 0,
    persistenciaAtiva,
    aviso: avisos.length ? avisos.join(" ") : null,
  });
}
