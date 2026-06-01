/**
 * Validação dedicada de handoff para Fase 4 (dry-run).
 * Uso: npm run validar:whatsapp-handoff-fase4
 */

import { handleInboundMessage } from "../lib/whatsapp/handleInbound";
import { resetConversationMemory } from "../lib/whatsapp/conversationService";
import { labelConversationState } from "../lib/whatsapp/stateLabels";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

async function main() {
  process.env.WHATSAPP_DRY_RUN = "1";
  process.env.WHATSAPP_BOT_ENABLED = "1";

  const waId = "5511999990099";
  resetConversationMemory(waId);

  const handoff = await handleInboundMessage({
    waId,
    text: "6",
    messageId: "wamid.TEST_FASE4_HANDOFF_001",
  });

  assert(
    "handoff acionado pela opção 6",
    handoff.handoff === true &&
      handoff.state === "handoff" &&
      handoff.repliesCount >= 1 &&
      !handoff.skipped
  );

  assert(
    "rótulo handoff = Aguardando equipe",
    labelConversationState("handoff") === "Aguardando equipe"
  );

  const duplicate = await handleInboundMessage({
    waId,
    text: "6",
    messageId: "wamid.TEST_FASE4_HANDOFF_001",
  });
  assert(
    "idempotência no handoff (duplicate)",
    duplicate.skipped === true && duplicate.reason === "duplicate"
  );

  console.log("\nHandoff Fase 4 validado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
