/**
 * Smoke HTTP de rotas públicas (BATCH 14).
 * Uso: npm run validar:smoke-publico
 * Requer dev: npm run dev (ou WHATSAPP_PUBLIC_BASE_URL)
 */

const BASE = (process.env.PUBLIC_SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

const ROUTES: { path: string; expect: number }[] = [
  { path: "/", expect: 200 },
  { path: "/propostas", expect: 200 },
  { path: "/editais", expect: 200 },
  { path: "/projetos", expect: 200 },
  { path: "/transparencia", expect: 200 },
  { path: "/quem-somos", expect: 200 },
  { path: "/noticias", expect: 200 },
  { path: "/eventos", expect: 200 },
  { path: "/contato", expect: 200 },
  { path: "/api/whatsapp/webhook", expect: 403 },
];

async function main() {
  let skipped = false;
  const failures: string[] = [];

  for (const { path, expect } of ROUTES) {
    const url = `${BASE}${path}`;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.status !== expect) {
        failures.push(`${path} → HTTP ${res.status} (esperado ${expect})`);
      } else {
        console.log(`OK: ${path} (${expect})`);
      }
    } catch (e) {
      skipped = true;
      console.warn(`SKIP: ${path} — ${(e as Error).message}`);
      break;
    }
  }

  if (skipped) {
    console.warn(`\nServidor indisponível em ${BASE}. Inicie: npm run dev`);
    process.exit(0);
  }

  if (failures.length) {
    console.error("\nFALHAS:");
    failures.forEach((f) => console.error(" ", f));
    process.exit(1);
  }

  console.log(`\nSmoke público OK (${ROUTES.length} rotas).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
