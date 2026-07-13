/**
 * Sobe o worker Digital usando variáveis do .env.local na raiz do projeto.
 *
 * Uso:
 *   node scripts/run-digital-publisher.cjs              # dry-run
 *   node scripts/run-digital-publisher.cjs --publish    # publicação real
 *   node scripts/run-digital-publisher.cjs --resident   # agente Windows (real + id fixo)
 *
 * Instalação única (Agendador): scripts/install-digital-agent-windows.ps1
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
  const args = process.argv.slice(2);
  const publishMode =
    args.includes("--publish") ||
    args.includes("--real") ||
    args.includes("-p") ||
    args.includes("--resident");
  const resident = args.includes("--resident");

  if (publishMode) {
    process.env.DIGITAL_PUBLISH_DRY_RUN = "false";
    if (!process.env.DIGITAL_BROWSER_CHANNEL) {
      process.env.DIGITAL_BROWSER_CHANNEL = "chrome";
    }
    if (!process.env.DIGITAL_BROWSER_HEADLESS) {
      // Residente: headless true evita janelas; Conectar (login) usa headed no job
      process.env.DIGITAL_BROWSER_HEADLESS = resident ? "true" : "false";
    }
    if (!process.env.DIGITAL_WORKER_ID) {
      process.env.DIGITAL_WORKER_ID = resident ? "worker-pc" : "worker-pc";
    }
  }

  if (resident) {
    process.env.DIGITAL_WORKER_ID = process.env.DIGITAL_WORKER_ID || "worker-pc";
    process.env.DIGITAL_PUBLISH_DRY_RUN = "false";
  }

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

  const dryRun = process.env.DIGITAL_PUBLISH_DRY_RUN !== "false";
  console.log("");
  console.log("=== Agente Digital IPECC ===");
  console.log(
    dryRun
      ? "Modo: DRY-RUN (simula; não publica de verdade)"
      : "Modo: PUBLICAÇÃO REAL"
  );
  if (resident) {
    console.log("Modo residente: fila automática — não feche se instalado no Agendador.");
  }
  console.log("Health: http://127.0.0.1:8791/");
  console.log("Guia: docs/DIGITAL-PUBLISHER-AGENTE-WINDOWS.md");
  console.log("");

  const logDir = path.join(workerDir, "data", "logs");
  if (resident) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const child = spawn("npm", ["run", "dev"], {
    cwd: workerDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
    windowsHide: resident,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
