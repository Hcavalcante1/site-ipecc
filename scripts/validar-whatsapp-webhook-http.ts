/**
 * Smoke HTTP do webhook contra dev local (opcional).
 * Requer: npm run dev + WHATSAPP_APP_SECRET em .env.local (mesmo valor usado para assinar).
 * Uso: npm run validar:whatsapp-webhook-http
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHmac } from "crypto";
import { loadEnvLocal } from "./lib/loadEnvLocal";

const BASE = (process.env.WHATSAPP_WEBHOOK_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const WEBHOOK = `${BASE}/api/whatsapp/webhook`;

function sign(body: string, secret: string) {
  return (
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex")
  );
}

async function fetchOk(
  label: string,
  init: RequestInit,
  expected: number
): Promise<Response | null> {
  try {
    const res = await fetch(WEBHOOK, init);
    if (res.status !== expected) {
      console.error(
        `FALHA ${label}: esperado HTTP ${expected}, recebido ${res.status}`,
        await res.text().catch(() => "")
      );
      process.exit(1);
    }
    console.log(`OK: ${label} (HTTP ${expected})`);
    return res;
  } catch (e) {
    console.warn(
      `SKIP: ${label} — servidor indisponível em ${BASE} (${(e as Error).message})`
    );
    console.warn("      Inicie com: npm run dev");
    return null;
  }
}

async function main() {
  const envPath = join(process.cwd(), ".env.local");
  let verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!verifyToken && existsSync(envPath)) {
    try {
      loadEnvLocal({ keys: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"] });
      verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
    } catch {
      /* ignore */
    }
  }

  if (verifyToken) {
    const url = `${WEBHOOK}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=CURSOR_META_TEST`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status !== 200 || (await res.text()) !== "CURSOR_META_TEST") {
        console.error("FALHA GET handshake Meta", res.status, await res.text());
        process.exit(1);
      }
      console.log("OK: GET handshake Meta (HTTP 200 + challenge)");
    } catch (e) {
      console.warn(`SKIP: GET handshake — ${(e as Error).message}`);
    }
  } else {
    const noCfg = await fetchOk("GET sem WHATSAPP_VERIFY_TOKEN", { method: "GET" }, 503);
    if (!noCfg) process.exit(0);
  }

  if (!verifyToken) {
    console.log(
      "OK: GET com servidor sem WHATSAPP_VERIFY_TOKEN (503 not_configured — esperado)"
    );
  }

  let secret = process.env.WHATSAPP_APP_SECRET?.trim();

  const postNoConfig = await fetchOk(
    "POST sem secret no servidor",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    secret ? 401 : 503
  );

  if (!postNoConfig) {
    process.exit(0);
  }

  if (!secret) {
    console.log(
      "\nPara testar POST assinado: defina WHATSAPP_APP_SECRET em .env.local, reinicie dev e rode de novo."
    );
    return;
  }

  const fixturePath = join(
    process.cwd(),
    "scripts/fixtures/whatsapp-text-inbound.json"
  );
  const rawBody = readFileSync(fixturePath, "utf8");
  const signature = sign(rawBody, secret);

  process.env.WHATSAPP_DRY_RUN = "1";
  process.env.WHATSAPP_BOT_ENABLED = "1";

  const res = await fetchOk(
    "POST fixture assinado",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    },
    200
  );

  if (!res) process.exit(0);

  const json = (await res.json()) as { processed?: number };
  if (json.processed !== 1) {
    console.error("FALHA: processed !== 1", json);
    process.exit(1);
  }
  console.log("OK: corpo JSON com processed=1");

  console.log("\nWebhook HTTP smoke concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
