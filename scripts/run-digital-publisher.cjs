/**
 * Sobe o worker Digital usando variáveis do .env.local na raiz do projeto.
 * Uso: node scripts/run-digital-publisher.cjs
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

function main() {
  loadEnvLocal();
  const workerDir = path.join(process.cwd(), "services", "digital-publisher");
  if (!fs.existsSync(workerDir)) {
    console.error("Pasta services/digital-publisher não encontrada.");
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Falta SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local."
    );
    process.exit(1);
  }

  console.log(
    "[run-digital-publisher] Iniciando worker (dry-run=%s)...",
    process.env.DIGITAL_PUBLISH_DRY_RUN !== "false" ? "true" : "false"
  );
  console.log(
    "[run-digital-publisher] Conectar conta: clique em Perfis → Conectar (browser) no admin."
  );

  const child = spawn("npm", ["run", "dev"], {
    cwd: workerDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
