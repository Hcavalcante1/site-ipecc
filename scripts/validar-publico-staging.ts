/**
 * Valida páginas públicas sem supabaseClient (browser admin).
 * Uso: npm run validar:publico
 */

import fs from "fs";
import path from "path";

const PUBLIC_ROOTS = [
  "app/page.tsx",
  "app/quem-somos",
  "app/projetos",
  "app/editais",
  "app/transparencia",
  "app/contato",
  "app/noticias",
  "app/eventos",
  "app/propostas",
  "app/acoes",
];

const FORBIDDEN = [
  /@\/lib\/supabaseClient/,
  /from ["']@\/lib\/supabaseClient["']/,
  /createBrowserClient/,
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name === "admin" || name === "api" || name === "login") continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
  }
  return acc;
}

function main() {
  const root = process.cwd();
  const files = new Set<string>();

  for (const rel of PUBLIC_ROOTS) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isFile()) files.add(full);
    else walk(full).forEach((f) => files.add(f));
  }

  const violacoes: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const re of FORBIDDEN) {
      if (re.test(content)) {
        violacoes.push(`${file} → ${re}`);
        break;
      }
    }
  }

  console.log("Arquivos públicos verificados:", files.size);

  if (violacoes.length) {
    console.error("FALHA — use supabasePublic ou supabaseServer (RSC):");
    violacoes.forEach((v) => console.error(" ", v));
    process.exit(1);
  }

  console.log("OK: nenhum supabaseClient em rotas públicas.");
}

main();
