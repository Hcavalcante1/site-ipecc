/**
 * Preflight para etapa 8 (Meta real): detecta template local vs credenciais reais.
 * Uso: npm run validar:whatsapp-meta-real-preflight
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./lib/loadEnvLocal";

const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");

const TEMPLATE_MARKERS = [
  "ipecc_local_app_secret_staging",
  "local_dry_run_no_graph",
  "000000000000000",
];

function main() {
  if (!existsSync(ENV_PATH)) {
    console.error("FALHA: .env.local ausente");
    process.exit(1);
  }

  loadEnvLocal({
    keys: [
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
    ],
  });

  const values = {
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ?? "",
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  };

  let templateHits = 0;
  for (const [key, val] of Object.entries(values)) {
    if (!val.trim()) {
      console.error(`FALHA: ${key} vazio`);
      process.exit(1);
    }
    const isTemplate = TEMPLATE_MARKERS.some((m) => val.includes(m));
    if (isTemplate) {
      templateHits++;
      console.log(`WARN: ${key} ainda usa valor do template local`);
    } else {
      console.log(`OK: ${key} não é o template padrão`);
    }
  }

  if (templateHits > 0) {
    console.log(
      "\nEtapa 8 (Meta real): substitua os valores em .env.local pelas credenciais do sandbox Meta."
    );
    console.log("Guia: docs/WHATSAPP-META-SANDBOX.md");
    process.exit(1);
  }

  console.log("\nOK: credenciais parecem reais (não-template). Próximo: ngrok + webhook na Meta.");
}

main();
