/**
 * Valida padrão visual/UX das páginas públicas (tipografia global + WhatsApp).
 * Uso: npm run validar:public-pages-padrao
 */

import { existsSync, readFileSync } from "fs";
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

const WHATSAPP_RE =
  /PublicWhatsAppCtaLink|WhatsAppLeadTrigger|PublicWhatsAppHelpLine|ApresentacaoCta/;

const PROJECT_SUBPAGES = [
  "app/projetos/valer-mais/page.tsx",
  "app/projetos/oficinas-educacao-cidada/page.tsx",
  "app/projetos/cultura-inclusao-social/page.tsx",
  "app/projetos/parcerias-institucionais/page.tsx",
];

const PUBLIC_PAGES_DIRECT_WHATSAPP = [
  "app/page.tsx",
    "app/inicio/page.tsx",
  "app/quem-somos/page.tsx",
  "app/projetos/page.tsx",
  "app/editais/page.tsx",
  "app/editais/[id]/page.tsx",
  "app/propostas/page.tsx",
  "app/transparencia/page.tsx",
  "app/contato/page.tsx",
  "app/eventos/page.tsx",
  "app/noticias/page.tsx",
  "app/noticias/[id]/page.tsx",
  "app/acoes/page.tsx",
];

function main() {
  const globals = read("app/globals.css");
  assert("tokens --public-text-base", globals.includes("--public-text-base:"));
  assert("tokens --public-leading", globals.includes("--public-leading:"));
  assert("main.page button cursor", globals.includes("main.page button"));
  assert(
    "public-card__resumo legível",
    globals.includes(".public-card__resumo") &&
      globals.includes("var(--public-text-sm)")
  );

  const projectDetail = read("components/public/PublicProjectDetail.tsx");
  assert(
    "PublicProjectDetail WhatsApp",
    projectDetail.includes("PublicWhatsAppHelpLine")
  );

  assert(
    "index usa ApresentacaoLanding",
    read("app/page.tsx").includes("ApresentacaoLanding")
  );

  const landing = read("components/public/ApresentacaoLanding.tsx");
  const landingContent = read("lib/landing/content.ts");
  assert(
    "landing chamada H1",
    landing.includes("{LANDING_CHAMADA}") &&
      landingContent.includes('LANDING_CHAMADA = "Educação, esporte, cultura e cidadania"')
  );
  assert(
    "menu label Portal (href /)",
    /href="\/"[\s\S]{0,400}Portal/.test(read("app/layout.tsx"))
  );

  const layout = read("app/layout.tsx");
  assert("layout PublicSiteFooter", layout.includes("PublicSiteFooter"));
  assert("layout PublicBreadcrumbs", layout.includes("PublicBreadcrumbs"));
  assert("layout menu ativo", layout.includes("menu__link--active"));

  for (const page of PUBLIC_PAGES_DIRECT_WHATSAPP) {
    const src = read(page);
    if (page === "app/page.tsx") continue;
    const hasHero =
      src.includes("PublicHeroRolling") || src.includes("ApresentacaoLanding");
    assert(`${page} hero padrão`, hasHero);
    assert(`${page} integração WhatsApp`, WHATSAPP_RE.test(src));
    const needsPageContent = [
      "app/editais/page.tsx",
      "app/editais/[id]/page.tsx",
    ];
    if (needsPageContent.includes(page)) {
      assert(`${page} PublicPageContent`, src.includes("PublicPageContent"));
    }
  }

  for (const page of PROJECT_SUBPAGES) {
    const src = read(page);
    assert(`${page} PublicProjectDetail`, src.includes("PublicProjectDetail"));
  }

  console.log("\nPadrão das páginas públicas validado.");
}

main();
