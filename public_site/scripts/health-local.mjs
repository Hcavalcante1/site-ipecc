const baseUrl = process.env.HEALTH_BASE_URL || "http://localhost:3000";
const url = new URL("/api/health", baseUrl);

try {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok || body.status !== "ok") {
    console.error(`Healthcheck inválido: HTTP ${response.status}`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`Healthcheck OK: ${url.href}`);
} catch (error) {
  console.error(`Healthcheck indisponível em ${url.href}: ${error.message}`);
  process.exit(1);
}
