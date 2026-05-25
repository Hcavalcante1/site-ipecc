/**
 * Simulador local do bot WhatsApp (Fase 1 — sem Meta).
 * Uso: npm run whatsapp:simulate -- oi
 *      npm run whatsapp:simulate -- 1
 *      npm run whatsapp:simulate -- reset
 */

import { simulateInbound, resetSession } from "../lib/whatsapp/simulator";
import { SITE_WHATSAPP_DEFAULT_MESSAGE } from "../lib/whatsapp/publicWhatsApp";

const WA_ID = "simulator-local-user";

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Uso: npm run whatsapp:simulate -- <mensagem|reset|site> [msg2 ...]");
    console.log("Exemplos: oi | menu | 1 | 6 | site | reset | oi 1 3");
    process.exit(0);
  }

  if (args.length === 1 && args[0] === "reset") {
    resetSession(WA_ID);
    console.log("Sessão reiniciada.");
    process.exit(0);
  }

  for (const raw of args) {
    if (raw === "reset") {
      resetSession(WA_ID);
      console.log("Sessão reiniciada.");
      continue;
    }

    const text = raw === "site" ? SITE_WHATSAPP_DEFAULT_MESSAGE : raw;

    const { context, result } = simulateInbound({
      waId: WA_ID,
      text,
      fromSite: raw === "site",
    });

    console.log("\n--- Usuário ---");
    console.log(text);
    console.log("\n--- Bot ---");
    for (const reply of result.replies) {
      console.log(reply.text);
      console.log("---");
    }
    console.log("Estado:", context.state);
    if (result.handoff) console.log("(handoff humano)");
  }
}

main();
