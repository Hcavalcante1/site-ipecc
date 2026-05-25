/**
 * Valida handshake GET Meta (verify) e cenários de erro.
 * Uso: npm run validar:whatsapp-meta
 */

import { verifyMetaWebhookGet } from "../lib/whatsapp/verifyWebhookGet";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function main() {
  const token = "ipecc_verify_staging_test";

  const ok = verifyMetaWebhookGet({
    mode: "subscribe",
    token,
    challenge: "CHALLENGE_99",
    verifyToken: token,
  });
  assert(
    "subscribe válido retorna challenge",
    ok.ok && ok.challenge === "CHALLENGE_99"
  );

  const wrong = verifyMetaWebhookGet({
    mode: "subscribe",
    token: "wrong",
    challenge: "x",
    verifyToken: token,
  });
  assert(
    "token errado → forbidden",
    !wrong.ok && "reason" in wrong && wrong.reason === "forbidden"
  );

  const noCfg = verifyMetaWebhookGet({
    mode: "subscribe",
    token,
    challenge: "x",
    verifyToken: undefined,
  });
  assert(
    "sem WHATSAPP_VERIFY_TOKEN → missing_config",
    !noCfg.ok && "reason" in noCfg && noCfg.reason === "missing_config"
  );

  const noChallenge = verifyMetaWebhookGet({
    mode: "subscribe",
    token,
    challenge: null,
    verifyToken: token,
  });
  assert("sem challenge → forbidden", !noChallenge.ok);

  console.log("\nMeta verify GET validado (in-process).");
}

main();
