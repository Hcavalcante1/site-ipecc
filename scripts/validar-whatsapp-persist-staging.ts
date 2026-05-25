/**
 * Valida persistência Supabase do bot (opcional).
 * Requer: .env.local com SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_PERSIST_SUPABASE=1
 *         e tabela docs/sql/whatsapp-conversations-staging.sql aplicada.
 * Uso: npm run validar:whatsapp-persist
 */

import { existsSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./lib/loadEnvLocal";
import { createInitialContext } from "../lib/whatsapp/botEngine";
import {
  loadConversation,
  resetConversationMemory,
  saveConversation,
} from "../lib/whatsapp/conversationService";

const TEST_WA = "5511999999991";

function skip(msg: string) {
  console.warn("SKIP:", msg);
  process.exit(0);
}

async function main() {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    try {
      loadEnvLocal({
        keys: [
          "WHATSAPP_PERSIST_SUPABASE",
          "SUPABASE_SERVICE_ROLE_KEY",
          "NEXT_PUBLIC_SUPABASE_URL",
        ],
      });
    } catch {
      skip(".env.local não legível");
    }
  }

  if (process.env.WHATSAPP_PERSIST_SUPABASE !== "1") {
    skip("WHATSAPP_PERSIST_SUPABASE=1 não definido");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    skip("SUPABASE_SERVICE_ROLE_KEY ausente");
  }

  const { supabaseAdmin } = await import("../lib/supabaseAdmin");

  const ctx = createInitialContext(TEST_WA);
  ctx.state = "handoff";
  ctx.unknownCount = 2;

  resetConversationMemory(TEST_WA);
  await saveConversation(ctx);

  resetConversationMemory(TEST_WA);
  const loaded = await loadConversation(TEST_WA);

  if (loaded.state !== "handoff" || loaded.unknownCount !== 2) {
    console.error("FALHA: estado não veio do Supabase", loaded);
    process.exit(1);
  }

  const { data: row, error: selErr } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("wa_id, state, unknown_count")
    .eq("wa_id", TEST_WA)
    .maybeSingle();

  if (selErr || !row || row.state !== "handoff") {
    console.error("FALHA: linha na tabela", selErr?.message ?? row);
    process.exit(1);
  }

  await supabaseAdmin
    .from("whatsapp_conversations")
    .delete()
    .eq("wa_id", TEST_WA);

  resetConversationMemory(TEST_WA);
  console.log("OK: persistência whatsapp_conversations (save + load + cleanup)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
