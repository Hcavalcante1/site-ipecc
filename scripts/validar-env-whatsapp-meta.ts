/**
 * Valida variáveis mínimas para execução da Fase 4 (WhatsApp Meta sandbox).
 * Uso:
 *   npm run validar:env-whatsapp-meta
 */

import { existsSync } from "fs";
import { join } from "path";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FALHA: ${name}`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

function main() {
  const envPath = join(process.cwd(), ".env.local");
  assert(".env.local presente", existsSync(envPath));

  try {
    loadEnvLocal({
      keys: [
        "WHATSAPP_VERIFY_TOKEN",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_API_VERSION",
        "WHATSAPP_BOT_ENABLED",
        "WHATSAPP_DRY_RUN",
      ],
    });
    requireEnv(
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`FALHA: ${msg}`);
    console.error("\nGuia: docs/WHATSAPP-META-SANDBOX.md · modelo: .env.example");
    process.exit(1);
  }
  assert("tokens e IDs obrigatórios definidos", true);

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim();
  assert(
    "WHATSAPP_API_VERSION válida",
    !!apiVersion && /^v\d+\.\d+$/.test(apiVersion)
  );

  const botEnabled = process.env.WHATSAPP_BOT_ENABLED?.trim();
  assert(
    "WHATSAPP_BOT_ENABLED em {0,1}",
    botEnabled === "0" || botEnabled === "1"
  );

  const dryRun = process.env.WHATSAPP_DRY_RUN?.trim();
  assert("WHATSAPP_DRY_RUN em {0,1}", dryRun === "0" || dryRun === "1");

  console.log("\nAmbiente WhatsApp Meta validado.");
}

main();
