/**
 * Validação E2E da lógica POST do webhook (sem servidor Next).
 * Uso: npm run validar:whatsapp-webhook
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createHmac } from "crypto";
import { processWebhookPost } from "../lib/whatsapp/processWebhookPost";
import { resetConversationMemory } from "../lib/whatsapp/conversationService";

const TEST_SECRET = "test_app_secret_staging_only";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function sign(body: string, secret: string) {
  return (
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex")
  );
}

async function main() {
  process.env.WHATSAPP_DRY_RUN = "1";
  process.env.WHATSAPP_BOT_ENABLED = "1";

  const noSecret = await processWebhookPost("{}", null, undefined);
  assert(
    "503 sem WHATSAPP_APP_SECRET",
    !noSecret.ok && noSecret.status === 503
  );

  const badSig = await processWebhookPost("{}", "sha256=dead", TEST_SECRET);
  assert("401 assinatura inválida", !badSig.ok && badSig.status === 401);

  const badJson = await processWebhookPost("{", sign("{", TEST_SECRET), TEST_SECRET);
  assert("400 JSON inválido", !badJson.ok && badJson.status === 400);

  const fixturePath = join(
    process.cwd(),
    "scripts/fixtures/whatsapp-text-inbound.json"
  );
  const rawBody = readFileSync(fixturePath, "utf8");
  const signature = sign(rawBody, TEST_SECRET);

  resetConversationMemory("5511999990000");
  const ok = await processWebhookPost(rawBody, signature, TEST_SECRET);
  assert(
    "200 fixture processado",
    ok.ok && ok.status === 200 && ok.processed === 1 && ok.results[0].repliesCount >= 1
  );

  const dup = await processWebhookPost(rawBody, signature, TEST_SECRET);
  assert(
    "idempotência no mesmo messageId",
    dup.ok && dup.results[0].skipped && dup.results[0].reason === "duplicate"
  );

  console.log("\nWebhook route (in-process) validado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
