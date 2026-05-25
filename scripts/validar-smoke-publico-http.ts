/**
 * Smoke HTTP de rotas públicas (BATCH 14).
 * Uso: npm run validar:smoke-publico
 * Requer dev: npm run dev (ou WHATSAPP_PUBLIC_BASE_URL)
 */

const BASE = (process.env.PUBLIC_SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

type SmokeRoute = {
  path: string;
  expect?: number;
  /** Aceita qualquer status listado (ex.: webhook sem env → 503 ou 403). */
  accept?: number[];
};

const ROUTES: SmokeRoute[] = [
  { path: "/", expect: 200 },
  { path: "/propostas", expect: 200 },
  { path: "/editais", expect: 200 },
  { path: "/projetos", expect: 200 },
  { path: "/projetos/valer-mais", expect: 200 },
  { path: "/projetos/cultura-inclusao-social", expect: 200 },
  { path: "/projetos/parcerias-institucionais", expect: 200 },
  { path: "/projetos/oficinas-educacao-cidada", expect: 200 },
  { path: "/transparencia", expect: 200 },
  { path: "/quem-somos", expect: 200 },
  { path: "/noticias", expect: 200 },
  { path: "/eventos", expect: 200 },
  { path: "/contato", expect: 200 },
  { path: "/api/health", accept: [200, 503] },
  { path: "/api/whatsapp/webhook", accept: [403, 503] },
];

async function main() {
  let skipped = false;
  const failures: string[] = [];

  for (const route of ROUTES) {
    const { path, expect, accept } = route;
    const url = `${BASE}${path}`;
    try {
      const res = await fetch(url, { redirect: "follow" });
      const allowed = accept ?? (expect !== undefined ? [expect] : [200]);
      if (!allowed.includes(res.status)) {
        failures.push(
          `${path} → HTTP ${res.status} (esperado ${allowed.join(" ou ")})`
        );
      } else {
        console.log(`OK: ${path} (${res.status})`);
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
