/**
 * Validação Fase 2 — assinatura, parse, handleInbound (dry-run).
 * Uso: npm run validar:whatsapp-fase2
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createHmac } from "crypto";
import { parseMetaWebhookPayload } from "../lib/whatsapp/parseWebhook";
import { verifyMetaWebhookSignature } from "../lib/whatsapp/verifySignature";
import { handleInboundMessage } from "../lib/whatsapp/handleInbound";
import { resetConversationMemory } from "../lib/whatsapp/conversationService";

const TEST_SECRET = "test_app_secret_staging_only";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

async function main() {
  const body = '{"test":true}';
  const sig =
    "sha256=" +
    createHmac("sha256", TEST_SECRET).update(body).digest("hex");

  assert(
    "verifyMetaWebhookSignature válida",
    verifyMetaWebhookSignature(body, sig, TEST_SECRET)
  );
  assert(
    "verifyMetaWebhookSignature inválida",
    !verifyMetaWebhookSignature(body, "sha256=dead", TEST_SECRET)
  );

  const fixturePath = join(
    process.cwd(),
    "scripts/fixtures/whatsapp-text-inbound.json"
  );
  const payload = JSON.parse(readFileSync(fixturePath, "utf8"));
  const messages = parseMetaWebhookPayload(payload);
  assert("parse fixture", messages.length === 1 && messages[0].text === "oi");

  process.env.WHATSAPP_DRY_RUN = "1";
  process.env.WHATSAPP_BOT_ENABLED = "1";

  resetConversationMemory("5511999990000");
  const r1 = await handleInboundMessage(messages[0]);
  assert("handleInbound responde", r1.repliesCount >= 1 && !r1.skipped);

  const r2 = await handleInboundMessage(messages[0]);
  assert("idempotência duplicate", r2.skipped && r2.reason === "duplicate");

  resetConversationMemory("5511999990000");
  const r3 = await handleInboundMessage({
    waId: "5511999990000",
    text: "3",
    messageId: "wamid.TEST_INBOUND_002",
  });
  assert("opção 3 propostas", r3.state === "topic_propostas");

  console.log("\nFase 2 validação concluída (dry-run).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
