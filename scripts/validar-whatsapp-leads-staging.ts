/**
 * Testa insert/delete em whatsapp_leads (staging).
 * Requer: SQL aplicado + WHATSAPP_LEADS_PERSIST_SUPABASE=1 + service role.
 * Uso: npm run validar:whatsapp-leads-staging
 */

import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";
import { persistWhatsAppLead } from "../lib/whatsapp/leadPersist";

async function main() {
  loadEnvLocal({
    keys: [
      "WHATSAPP_LEADS_PERSIST_SUPABASE",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ],
  });

  if (process.env.WHATSAPP_LEADS_PERSIST_SUPABASE !== "1") {
    console.warn("SKIP: WHATSAPP_LEADS_PERSIST_SUPABASE=1 não definido");
    process.exit(0);
  }

  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { supabaseAdmin } = await import("../lib/supabaseAdmin");

  const probe = await supabaseAdmin.from("whatsapp_leads").select("id").limit(1);
  if (probe.error) {
    console.error("Tabela ausente:", probe.error.message);
    console.error("Rode: npm run aplicar:whatsapp-leads-staging");
    process.exit(1);
  }

  const saved = await persistWhatsAppLead({
    nome: "Validação Script",
    organizacao: "IPECC QA",
    telefone: "5511999990000",
    email: "qa@ipecc.local",
    assunto: "outro",
    mensagem: "teste automatizado",
    pagina_origem: "/validacao-script",
    user_agent: "validar-whatsapp-leads-staging",
  });

  if (saved.ok === false) {
    console.error("FALHA persist:", saved.message);
    process.exit(1);
  }

  const { data: row, error: selErr } = await supabaseAdmin
    .from("whatsapp_leads")
    .select("id, nome, assunto")
    .eq("nome", "Validação Script")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr || !row) {
    console.error("FALHA select:", selErr?.message ?? "sem linha");
    process.exit(1);
  }

  await supabaseAdmin.from("whatsapp_leads").delete().eq("id", row.id);

  console.log("OK: whatsapp_leads insert + cleanup");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
