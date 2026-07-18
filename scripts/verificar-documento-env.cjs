/**
 * Relata se DOCUMENTO_* está definido (sem imprimir valores).
 */
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function has(v) {
  return Boolean(v && String(v).trim());
}

const file = loadEnvLocal();
const keys = [
  "DOCUMENTO_API_URL",
  "DOCUMENTO_API_TOKEN",
  "DOCUMENTO_WEBHOOK_SECRET",
  "DOCUMENSO_API_URL",
  "DOCUMENSO_API_TOKEN",
  "DOCUMENSO_WEBHOOK_SECRET",
];

for (const k of keys) {
  const inFile = has(file[k]);
  const inEnv = has(process.env[k]);
  console.log(`${k}: file=${inFile ? "yes" : "no"} process=${inEnv ? "yes" : "no"}`);
}

const url =
  file.DOCUMENTO_API_URL ||
  process.env.DOCUMENTO_API_URL ||
  file.DOCUMENSO_API_URL ||
  process.env.DOCUMENSO_API_URL ||
  "";
const token =
  file.DOCUMENTO_API_TOKEN ||
  process.env.DOCUMENTO_API_TOKEN ||
  file.DOCUMENSO_API_TOKEN ||
  process.env.DOCUMENSO_API_TOKEN ||
  "";

if (url) {
  try {
    console.log("api_host=" + new URL(url).host);
  } catch {
    console.log("api_host=invalid");
  }
}

const ok = has(url) && has(token);
console.log("assinatura_documento_pronta=" + (ok ? "SIM" : "NAO"));
process.exit(ok ? 0 : 2);
