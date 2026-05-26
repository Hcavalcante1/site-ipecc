/**
 * Enterprise Guard LOCAL — engenharia do site IPECC.
 * Substitui automations na nuvem do Cursor: roda na sua máquina, sem composer.
 *
 * Uso:
 *   npm run guard:enterprise
 *   npm run guard:enterprise -- --no-build   (pula ci:local / build opcional)
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const REPORTS = path.join(ROOT, "reports");
const LOCK = path.join(REPORTS, ".enterprise-guard.lock");
const SKIP_BUILD = process.argv.includes("--no-build");

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function log(line: string, report: fs.WriteStream) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  report.write(msg + "\n");
}

function acquireLock(): void {
  fs.mkdirSync(REPORTS, { recursive: true });
  if (fs.existsSync(LOCK)) {
    const pid = fs.readFileSync(LOCK, "utf8").trim();
    console.error(
      `Enterprise Guard já em execução (lock: ${LOCK}, pid ${pid}). Aguarde ou remova o lock se travou.`
    );
    process.exit(2);
  }
  fs.writeFileSync(LOCK, String(process.pid), "utf8");
}

function releaseLock(): void {
  try {
    fs.unlinkSync(LOCK);
  } catch {
    /* ignore */
  }
}

function runGate(report: fs.WriteStream): number {
  log("Iniciando gate: npm run validar:enterprise", report);
  const env = { ...process.env };
  if (SKIP_BUILD) {
    env.ENTERPRISE_GUARD_SKIP_BUILD = "1";
    log("Modo --no-build: ci:local será ignorado pelo validar:enterprise", report);
  }

  const r = spawnSync("npm", ["run", "validar:enterprise"], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (r.stdout) report.write(r.stdout);
  if (r.stderr) report.write(r.stderr);

  return r.status ?? 1;
}

async function main() {
  const started = Date.now();
  const reportPath = path.join(REPORTS, `enterprise-guard-${stamp()}.log`);
  const report = fs.createWriteStream(reportPath, { flags: "a" });

  acquireLock();
  process.on("exit", releaseLock);
  process.on("SIGINT", () => {
    releaseLock();
    process.exit(130);
  });

  log("=== Enterprise Guard LOCAL (engenharia IPECC) ===", report);
  log(`Relatório: ${reportPath}`, report);
  log(`Diretório: ${ROOT}`, report);

  let code = 1;
  try {
    code = runGate(report);
  } catch (e) {
    log(`Erro inesperado: ${e instanceof Error ? e.message : String(e)}`, report);
    code = 1;
  } finally {
    const sec = ((Date.now() - started) / 1000).toFixed(1);
    const status = code === 0 ? "OK" : "FALHOU";
    log(`=== ${status} em ${sec}s (exit ${code}) ===`, report);
    report.end();
    releaseLock();

    // Último status rápido (para scripts/CI local)
    const lastPath = path.join(REPORTS, "enterprise-guard-last.txt");
    fs.writeFileSync(
      lastPath,
      `${status}\nexit=${code}\nseconds=${sec}\nreport=${reportPath}\n`,
      "utf8"
    );
  }

  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  releaseLock();
  process.exit(1);
});
