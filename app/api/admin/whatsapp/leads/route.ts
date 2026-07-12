import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isWhatsAppLeadPersistEnabled } from "@/lib/whatsapp/leadPersist";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const persistenciaAtiva = isWhatsAppLeadPersistEnabled();

  const { data, error } = await supabaseAdmin
    .from("whatsapp_leads")
    .select(
      "id, created_at, nome, organizacao, telefone, email, assunto, mensagem, pagina_origem"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    const missing =
      error.message.includes("whatsapp_leads") ||
      error.code === "42P01" ||
      /schema cache/i.test(error.message);
    return NextResponse.json({
      ok: true,
      leads: [],
      persistenciaAtiva,
      aviso: missing
        ? "Tabela whatsapp_leads ausente. Aplique docs/sql/whatsapp-leads-staging.sql no Supabase."
        : error.message,
    });
  }

  const avisos: string[] = [];
  if (!persistenciaAtiva) {
    avisos.push(
      "Persistência de leads desligada no servidor (WHATSAPP_LEADS_PERSIST_SUPABASE≠1). O formulário público ainda abre o WhatsApp, mas não grava no banco."
    );
  }

  return NextResponse.json({
    ok: true,
    leads: data ?? [],
    persistenciaAtiva,
    aviso: avisos.length ? avisos.join(" ") : null,
  });
}
