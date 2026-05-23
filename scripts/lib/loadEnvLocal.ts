import fs from "fs";
import path from "path";

const DEFAULT_ENV_PATH = path.join(process.cwd(), ".env.local");

export type LoadEnvLocalOptions = {
  /** Se informado, carrega apenas estas chaves. */
  keys?: string[];
  filePath?: string;
};

/**
 * Carrega variáveis de .env.local para scripts operacionais (tsx).
 * Não substitui o carregamento automático do Next.js em `next dev`.
 */
export function loadEnvLocal(options: LoadEnvLocalOptions = {}) {
  const envPath = options.filePath ?? DEFAULT_ENV_PATH;
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo ${envPath} não encontrado.`);
  }

  const allow = options.keys ? new Set(options.keys) : null;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, i).trim();
    if (allow && !allow.has(key)) continue;
    process.env[key] = line.slice(i + 1).trim();
  }
}

export function requireEnv(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length > 0) {
    throw new Error(`Defina em .env.local: ${missing.join(", ")}`);
  }
}
