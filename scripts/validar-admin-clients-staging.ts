/**
 * Valida admin sem createClient inline (@supabase/supabase-js).
 * Uso: npm run validar:admin
 */

import fs from "fs";
import path from "path";

const ADMIN_ROOT = path.join(process.cwd(), "app", "admin");

const FORBIDDEN = [
  /from ["']@supabase\/supabase-js["']/,
  /createClient\s*\(\s*process\.env/,
  /createBrowserClient\s*\(/,
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
  }
  return acc;
}

function main() {
  const files = walk(ADMIN_ROOT);
  const violacoes: string[] = [];
  let comClientCanonico = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const re of FORBIDDEN) {
      if (re.test(content)) {
        violacoes.push(`${file} → ${re}`);
        break;
      }
    }
    if (/@\/lib\/supabaseClient/.test(content)) {
      comClientCanonico++;
    }
  }

  console.log("Arquivos admin verificados:", files.length);
  console.log("Com import @/lib/supabaseClient:", comClientCanonico);

  if (violacoes.length) {
    console.error("FALHA — use @/lib/supabaseClient:");
    violacoes.forEach((v) => console.error(" ", v));
    process.exit(1);
  }

  console.log("OK: nenhum createClient inline no admin.");
}

main();
