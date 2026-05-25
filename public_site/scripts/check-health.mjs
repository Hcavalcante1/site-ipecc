const baseUrl = process.argv[2] ?? "http://localhost:3050";
const url = new URL("/api/health", baseUrl).href;

const res = await fetch(url, { cache: "no-store" });

if (!res.ok) {
  console.error(`Healthcheck falhou: HTTP ${res.status}`);
  process.exit(1);
}

const body = await res.json();

if (body.status !== "ok" || body.service !== "apecc-site") {
  console.error("Healthcheck retornou payload inesperado:", body);
  process.exit(1);
}

console.log(`Healthcheck OK: ${body.service} (${body.environment})`);

