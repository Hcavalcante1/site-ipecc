import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/quem-somos/page.tsx",
  "app/projetos/page.tsx",
  "app/editais/page.tsx",
  "app/transparencia/page.tsx",
  "app/contato/page.tsx",
  "app/login/page.tsx",
  "app/admin/page.tsx",
  "middleware.ts",
  "public/robots.txt",
  "public/sitemap.xml",
];

const requiredDocs = [
  "public/docs/estatuto-social.pdf",
  "public/docs/politica-lgpd.pdf",
  "public/docs/cnpj-cartao.pdf",
  "public/docs/modelo-proposta.docx",
];

const assertFile = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    failures.push(`Arquivo obrigatório ausente: ${relativePath}`);
  }
};

for (const file of requiredFiles) assertFile(file);
for (const file of requiredDocs) assertFile(file);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["build", "start", "typecheck", "validar:enterprise", "audit:deps", "audit:anexos", "verify:proposta-anexos", "smoke:local"]) {
  if (!packageJson.scripts?.[script]) {
    failures.push(`Script obrigatório ausente: ${script}`);
  }
}

const adminLayout = fs.readFileSync(path.join(root, "app", "admin", "layout.tsx"), "utf8");
const adminLinks = [...adminLayout.matchAll(/href="(\/admin\/[^"]+)"/g)].map((match) => match[1]);
for (const href of adminLinks) {
  const routePath = href.replace(/^\/admin\/?/, "");
  const pagePath = routePath ? path.join(root, "app", "admin", routePath, "page.tsx") : path.join(root, "app", "admin", "page.tsx");
  if (!fs.existsSync(pagePath)) {
    failures.push(`Link admin sem página local: ${href}`);
  }
}

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
for (const ignored of ["node_modules", ".next", "tsconfig.tsbuildinfo"]) {
  if (!gitignore.split(/\r?\n/).includes(ignored)) {
    failures.push(`Artefato local não ignorado: ${ignored}`);
  }
}

if (failures.length > 0) {
  console.error("validar:enterprise encontrou problemas:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("validar:enterprise OK");
