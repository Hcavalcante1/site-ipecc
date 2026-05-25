/**
 * Valida painel flutuante WhatsApp (opções + URLs wa.me).
 * Uso: npm run validar:whatsapp-public-chat
 */

import {
  PUBLIC_WHATSAPP_CHAT_OPTIONS,
  SITE_WHATSAPP_DEFAULT_MESSAGE,
  buildWhatsAppUrl,
  getWhatsAppUrlForChatOption,
} from "../lib/whatsapp/publicWhatsApp";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function main() {
  assert("6 opções", PUBLIC_WHATSAPP_CHAT_OPTIONS.length === 6);

  const labels = PUBLIC_WHATSAPP_CHAT_OPTIONS.map((o) => o.label);
  assert(
    "labels esperados",
    labels.join("|") ===
      "Projetos|Editais|Propostas|Transparência|Eventos|Falar com a equipe"
  );

  for (const opt of PUBLIC_WHATSAPP_CHAT_OPTIONS) {
    const url = getWhatsAppUrlForChatOption(opt.id);
    assert(`URL ${opt.id}`, url.startsWith("https://wa.me/"));
    const text = new URL(url).searchParams.get("text");
    assert(`mensagem ${opt.id}`, text === opt.message);
  }

  const fallback = buildWhatsAppUrl();
  assert("fallback default", fallback.startsWith("https://wa.me/"));
  assert(
    "mensagem padrão",
    new URL(fallback).searchParams.get("text") === SITE_WHATSAPP_DEFAULT_MESSAGE
  );

  console.log("\nPainel público WhatsApp validado.");
}

main();
