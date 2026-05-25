/**
 * Validação estática Fase 3 — painel admin WhatsApp.
 * Uso: npm run validar:whatsapp-fase3
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const REQUIRED = [
  "app/admin/whatsapp/page.tsx",
  "app/api/admin/whatsapp/conversations/route.ts",
  "lib/whatsapp/stateLabels.ts",
  "docs/FASE-WHATSAPP-FASE3.md",
];

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function main() {
  for (const rel of REQUIRED) {
    assert(`arquivo ${rel}`, fs.existsSync(path.join(ROOT, rel)));
  }

  const api = fs.readFileSync(
    path.join(ROOT, "app/api/admin/whatsapp/conversations/route.ts"),
    "utf8"
  );
  assert("API usa verifyAdminSession", /verifyAdminSession/.test(api));
  assert("API usa supabaseAdmin", /supabaseAdmin/.test(api));

  const page = fs.readFileSync(
    path.join(ROOT, "app/admin/whatsapp/page.tsx"),
    "utf8"
  );
  assert(
    "página usa API admin (não tabela direta)",
    /\/api\/admin\/whatsapp\/conversations/.test(page) &&
      !/\.from\(["']whatsapp_conversations["']\)/.test(page)
  );

  const layout = fs.readFileSync(
    path.join(ROOT, "app/admin/layout.tsx"),
    "utf8"
  );
  assert("nav admin WhatsApp", /\/admin\/whatsapp/.test(layout));

  console.log("\nFase 3 validação estática concluída.");
}

main();
