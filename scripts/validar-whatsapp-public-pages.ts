/**
 * Valida integração do pré-cadastro nas páginas públicas (estático).
 * Uso: npm run validar:whatsapp-public-pages
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function read(rel: string): string {
  const path = join(ROOT, rel);
  assert(`arquivo ${rel}`, existsSync(path));
  return readFileSync(path, "utf8");
}

function main() {
  const layout = read("app/layout.tsx");
  assert("layout WhatsAppChatProvider", layout.includes("WhatsAppChatProvider"));
  assert("layout topbar WhatsApp", layout.includes('aria-label="WhatsApp — atendimento"'));
  assert("layout openPanel topbar", layout.includes("openPanel()"));

  for (const page of [
    "app/page.tsx",
    "app/projetos/page.tsx",
    "app/editais/page.tsx",
    "app/propostas/page.tsx",
    "app/transparencia/page.tsx",
    "app/eventos/page.tsx",
    "app/contato/page.tsx",
    "app/quem-somos/page.tsx",
  ]) {
    const src = read(page);
    const hasIntegration =
      src.includes("PublicWhatsAppCtaLink") ||
      src.includes("WhatsAppLeadTrigger") ||
      src.includes("PublicWhatsAppHelpLine") ||
      src.includes("openPanel");
    assert(`${page} integração WhatsApp`, hasIntegration);
  }

  for (const page of [
    "app/propostas/page.tsx",
    "app/editais/page.tsx",
    "app/transparencia/page.tsx",
  ]) {
    assert(
      `${page} PublicWhatsAppHelpLine`,
      read(page).includes("PublicWhatsAppHelpLine")
    );
  }

  assert(
    "componentes exportados",
    read("components/public/index.ts").includes("WhatsAppLeadForm") &&
      read("components/public/index.ts").includes("PublicWhatsAppHelpLine")
  );

  console.log("\nIntegração páginas públicas WhatsApp validada.");
}

main();
