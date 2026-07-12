/**
 * Validação Fase 1 — motor puro do bot (sem rede).
 * Uso: npm run validar:whatsapp-bot
 */

import { applyTurn, createInitialContext } from "../lib/whatsapp/botEngine";
import { resolveMenuOption } from "../lib/whatsapp/botMenu";
import {
  createSiteBotContext,
  getSiteBotQuickOptions,
  runSiteBotTurn,
} from "../lib/whatsapp/siteBotScript";

let ok = 0;
let fail = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    ok++;
  } else {
    fail++;
    console.error("FALHA:", name);
  }
}

function main() {
  let ctx = createInitialContext("test-user");

  const r1 = applyTurn(ctx, { waId: "test-user", text: "oi" });
  assert("saudação -> menu", r1.result.nextState === "menu");
  assert("resposta não vazia", r1.result.replies[0].text.length > 20);
  ctx = r1.ctx;

  const r2 = applyTurn(ctx, { waId: "test-user", text: "1" });
  assert("opção 1 projetos", r2.result.nextState === "topic_projetos");
  assert(
    "submenu A/B/C no tema",
    /A —/i.test(r2.result.replies[0].text) &&
      /B —/i.test(r2.result.replies[0].text)
  );
  ctx = r2.ctx;

  const r2b = applyTurn(ctx, { waId: "test-user", text: "a" });
  assert("subopção A permanece no tema", r2b.result.nextState === "topic_projetos");
  assert("subopção A com conteúdo", r2b.result.replies[0].text.length > 40);
  ctx = r2b.ctx;

  const r3 = applyTurn(ctx, { waId: "test-user", text: "0" });
  assert("voltar menu com 0", r3.result.nextState === "menu");
  ctx = r3.ctx;

  const r4 = applyTurn(ctx, { waId: "test-user", text: "6" });
  assert("handoff", r4.result.nextState === "handoff" && r4.result.handoff === true);
  ctx = r4.ctx;

  const r5 = applyTurn(ctx, { waId: "test-user", text: "sair" });
  assert("encerrar", r5.result.nextState === "closed");

  assert("menu resolve 6 opções", MENU_OPTIONS_COUNT() === 6);

  // Script do site (bot flutuante)
  let siteCtx = createSiteBotContext();
  const s1 = runSiteBotTurn(siteCtx, "oi");
  assert("site bot saudacao", s1.replies.length > 0 && s1.ctx.state === "menu");
  siteCtx = s1.ctx;
  const s2 = runSiteBotTurn(siteCtx, "2");
  assert("site bot editais", s2.ctx.state === "topic_editais");
  assert(
    "site bot quick A/B/C",
    getSiteBotQuickOptions(s2.ctx.state).some((o) => o.id === "a")
  );
  siteCtx = s2.ctx;
  const s3 = runSiteBotTurn(siteCtx, "b");
  assert("site bot sub B", s3.replies.join(" ").length > 30);
  siteCtx = s3.ctx;
  const s4 = runSiteBotTurn(siteCtx, "6");
  assert("site bot handoff", s4.handoff === true);

  console.log(`\nOK: ${ok} | Falhas: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

function MENU_OPTIONS_COUNT() {
  return ["1", "2", "3", "4", "5", "6"].filter((k) =>
    resolveMenuOption(k)
  ).length;
}

main();
