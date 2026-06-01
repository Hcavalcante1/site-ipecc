/**
 * Garante que o código não reintroduza links para rotas admin legadas.
 * Uso: npm run validar:admin-rotas
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { adminLegacyRedirectPages } from "../lib/admin/canonicalAdminRoutes";

const ROOT = join(__dirname, "..");

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const FORBIDDEN: { re: RegExp; hint: string }[] = [
  {
    re: /["'`]\/admin\/paginas\/quem-somos\/institucional["'`]/,
    hint: "use adminCanonicalRoutes.quemSomos.blocoPrincipal",
  },
  {
    re: /["'`]\/admin\/paginas\/quem-somos\/eixos["'`]/,
    hint: "use adminCanonicalRoutes.quemSomos.atuacao",
  },
  {
    re: /\/admin\/paginas\/editais\/\$\{/,
    hint: "use adminCanonicalRoutes.editaisCadastro.editar(id)",
  },
  {
    re: /["'`]\/admin\/editais\/hero["'`]/,
    hint: "use adminCanonicalRoutes.editaisCms.hero",
  },
  {
    re: /["'`]\/admin\/editais\/documentos["'`]/,
    hint: "use adminCanonicalRoutes.editaisCms.documentos",
  },
  {
    re: /["'`]\/admin\/editais\/mural["'`]/,
    hint: "use adminCanonicalRoutes.editaisCms.mural",
  },
  {
    re: /["'`]\/admin\/editais\/textos["'`]/,
    hint: "use editaisCms.textos ou documentos (ver docs/ADMIN-ROTAS-CANONICAS.md)",
  },
  {
    re: /["'`]\/admin\/dashboard["'`]/,
    hint: "use adminCanonicalRoutes.dashboard (/admin)",
  },
  {
    re: /["'`]\/admin\/paginas\/contato\/protocolos["'`]/,
    hint: "rota removida — não existe na página pública",
  },
];

function relPosix(file: string): string {
  return relative(ROOT, file).split("\\").join("/");
}

function main() {
  for (const rel of Object.keys(adminLegacyRedirectPages)) {
    const path = join(ROOT, rel);
    assert(`redirect legado existe: ${rel}`, existsSync(path));
    const src = readFileSync(path, "utf8");
    assert(`${rel} usa redirect()`, src.includes("redirect("));
    assert(
      `${rel} usa adminCanonicalRoutes`,
      src.includes("adminCanonicalRoutes")
    );
  }

  const scanRoots = ["app", "components", "lib"].map((d) => join(ROOT, d));
  const files = scanRoots.flatMap((d) => walk(d));

  const legacySet = new Set(Object.keys(adminLegacyRedirectPages));
  const violations: string[] = [];

  for (const file of files) {
    const rel = relPosix(file);
    if (legacySet.has(rel)) continue;
    if (rel === "lib/admin/canonicalAdminRoutes.ts") continue;
    if (rel.startsWith("scripts/validar-admin-rotas-canonicas.ts")) continue;

    const content = readFileSync(file, "utf8");
    for (const { re, hint } of FORBIDDEN) {
      if (re.test(content)) {
        violations.push(`${rel}: ${hint} (${re})`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Links legados encontrados no código:");
    for (const v of violations) console.error(" -", v);
    process.exit(1);
  }

  assert("nenhum link legado fora das páginas redirect", true);
  console.log("\nvalidar-admin-rotas-canonicas: tudo OK");
}

main();
