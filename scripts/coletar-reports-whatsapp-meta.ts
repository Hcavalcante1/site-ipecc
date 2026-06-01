/**
 * Coleta reports da Fase 4 em UTF-8 (evita UTF-16 do Tee-Object no PowerShell).
 * Uso:
 *   npm run coletar:reports-whatsapp-meta
 *   npm run coletar:reports-whatsapp-meta -- --parcial   # não exige WHATSAPP_* no .env
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./lib/loadEnvLocal";

const ROOT = join(__dirname, "..");
const REPORTS = join(ROOT, "reports");
const PARCIAL = process.argv.includes("--parcial");

const STEPS: { file: string; cmd: string }[] = [
  { file: "whatsapp-meta.txt", cmd: "npm run validar:whatsapp-meta" },
  { file: "whatsapp-webhook.txt", cmd: "npm run validar:whatsapp-webhook" },
  {
    file: "whatsapp-webhook-http.txt",
    cmd: "npm run validar:whatsapp-webhook-http",
  },
  {
    file: "whatsapp-handoff-fase4.txt",
    cmd: "npm run validar:whatsapp-handoff-fase4",
  },
];

function checkDev() {
  try {
    const res = fetch("http://localhost:3000", { method: "GET" });
    return res.then((r) => r.status >= 200 && r.status < 500);
  } catch {
    return Promise.resolve(false);
  }
}

function checkEnv(): boolean {
  try {
    loadEnvLocal({
      keys: [
        "WHATSAPP_VERIFY_TOKEN",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
      ],
    });
  } catch {
    return false;
  }
  const required = [
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
  ];
  return required.every((k) => !!process.env[k]?.trim());
}

function runStep(cmd: string, outPath: string): number {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    writeFileSync(outPath, out, "utf8");
    return 0;
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    const body = [err.stdout ?? "", err.stderr ?? ""].filter(Boolean).join("\n");
    writeFileSync(outPath, body || String(e), "utf8");
    return typeof err.status === "number" ? err.status : 1;
  }
}

async function main() {
  if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

  const devOk = await checkDev();
  if (!devOk) {
    console.error(
      "FALHA: npm run dev não está acessível em http://localhost:3000"
    );
    process.exit(1);
  }
  console.log("OK: dev server em http://localhost:3000");

  const envOk = checkEnv();
  if (!envOk) {
    if (!PARCIAL) {
      console.error(
        "FALHA: WHATSAPP_* ausentes em .env.local (use --parcial ou preencha o ambiente)"
      );
      process.exit(1);
    }
    console.warn(
      "WARN: modo --parcial (WHATSAPP_* ausentes; webhook-http pode ficar incompleto)"
    );
  }

  for (const { file } of STEPS) {
    const abs = join(REPORTS, file);
    if (existsSync(abs)) rmSync(abs);
  }

  let worst = 0;
  for (const { file, cmd } of STEPS) {
    const abs = join(REPORTS, file);
    console.log(`Coletando ${file} ...`);
    const code = runStep(cmd, abs);
    if (code !== 0) worst = code;
    console.log(code === 0 ? `OK: ${file}` : `WARN: ${file} (exit ${code})`);
  }

  if (!envOk) {
    console.log(
      "\nPróximo passo: preencha WHATSAPP_* e rode npm run coletar:reports-whatsapp-meta"
    );
  }

  process.exit(worst);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
