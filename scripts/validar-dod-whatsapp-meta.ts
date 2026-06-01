/**
 * Valida o DoD da Fase 4 (WhatsApp Meta sandbox) com base nos reports.
 * Uso:
 *   npm run validar:dod-whatsapp-meta
 *   npm run validar:dod-whatsapp-meta:parcial
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

type Rule = {
  file: string;
  mustInclude: string[];
  forbidPatterns: RegExp[];
};

const ROOT = join(__dirname, "..");
const MAX_REPORT_AGE_HOURS = Number(process.env.WHATSAPP_DOD_MAX_AGE_HOURS || "6");
const PARCIAL =
  process.argv.includes("--parcial") ||
  process.env.WHATSAPP_DOD_PARCIAL === "1";

const RULES_FULL: Rule[] = [
  {
    file: "reports/whatsapp-meta.txt",
    mustInclude: [
      "OK: subscribe válido retorna challenge",
      "OK: token errado → forbidden",
      "OK: sem WHATSAPP_VERIFY_TOKEN → missing_config",
    ],
    forbidPatterns: [/FALHA/i, /\bERROR\b/i, /\bSKIP\b/i],
  },
  {
    file: "reports/whatsapp-webhook.txt",
    mustInclude: [
      "OK: 503 sem WHATSAPP_APP_SECRET",
      "OK: 401 assinatura inválida",
      "OK: 400 JSON inválido",
      "OK: 200 fixture processado",
      "OK: idempotência no mesmo messageId",
    ],
    forbidPatterns: [/FALHA/i, /\bERROR\b/i, /\bSKIP\b/i],
  },
  {
    file: "reports/whatsapp-webhook-http.txt",
    mustInclude: [
      "OK: GET handshake Meta (HTTP 200 + challenge)",
      "OK: POST fixture assinado (HTTP 200)",
      "OK: corpo JSON com processed=1",
    ],
    forbidPatterns: [/FALHA/i, /\bERROR\b/i, /\bSKIP\b/i],
  },
  {
    file: "reports/whatsapp-handoff-fase4.txt",
    mustInclude: [
      "OK: handoff acionado pela opção 6",
      "OK: rótulo handoff = Aguardando equipe",
      "OK: idempotência no handoff (duplicate)",
    ],
    forbidPatterns: [/FALHA/i, /\bERROR\b/i, /\bSKIP\b/i],
  },
];

const HTTP_PARCIAL: Rule = {
  file: "reports/whatsapp-webhook-http.txt",
  mustInclude: [
    "OK: GET sem WHATSAPP_VERIFY_TOKEN",
    "OK: POST sem secret no servidor",
  ],
  forbidPatterns: [/FALHA/i, /\bERROR\b/i, /\bSKIP\b/i],
};

function fail(msg: string): never {
  console.error(`FALHA: ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`OK: ${msg}`);
}

function warn(msg: string) {
  console.log(`WARN: ${msg}`);
}

function validateRule(rule: Rule, allowSkip: boolean) {
  const abs = join(ROOT, rule.file);
  if (!existsSync(abs)) {
    fail(`arquivo ausente: ${rule.file}`);
  }
  ok(`arquivo presente: ${rule.file}`);

  const ageMs = Date.now() - statSync(abs).mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours > MAX_REPORT_AGE_HOURS) {
    fail(
      `${rule.file} desatualizado (${ageHours.toFixed(1)}h). ` +
        `Reexecute a coleta (limite: ${MAX_REPORT_AGE_HOURS}h).`
    );
  }
  ok(
    `${rule.file} recente (${ageHours.toFixed(1)}h <= ${MAX_REPORT_AGE_HOURS}h)`
  );

  const src = readFileSync(abs, "utf8");

  for (const expected of rule.mustInclude) {
    if (!src.includes(expected)) {
      fail(`${rule.file} sem evidência esperada: "${expected}"`);
    }
    ok(`${rule.file} contém: "${expected}"`);
  }

  for (const pattern of rule.forbidPatterns) {
    if (allowSkip && pattern.source.includes("SKIP")) {
      continue;
    }
    if (pattern.test(src)) {
      fail(`${rule.file} contém padrão proibido: ${pattern}`);
    }
  }
}

function main() {
  const allowSkip = process.env.WHATSAPP_DOD_ALLOW_SKIP === "1";
  const rules = PARCIAL
    ? [
        ...RULES_FULL.filter((r) => r.file !== HTTP_PARCIAL.file),
        HTTP_PARCIAL,
      ]
    : RULES_FULL;

  if (PARCIAL) {
    warn(
      "modo parcial: webhook-http aceita evidência sem WHATSAPP_* (503 not_configured)"
    );
  }

  for (const rule of rules) {
    validateRule(rule, allowSkip);
  }

  if (PARCIAL) {
    warn(
      "DoD parcial OK. Para fechar a Fase 4: preencha WHATSAPP_* e rode npm run fase4:whatsapp-meta"
    );
    console.log("\nDoD parcial da Fase 4 validado.");
    return;
  }

  console.log("\nDoD da Fase 4 validado com sucesso.");
}

main();
