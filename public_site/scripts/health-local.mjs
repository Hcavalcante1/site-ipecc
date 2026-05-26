const baseUrl = process.env.LOCAL_BASE_URL || "http://localhost:3000";
const url = new URL("/api/health", baseUrl);

try {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.text();

  if (!response.ok) {
    console.error(`[health:local] HTTP ${response.status}: ${body}`);
    process.exit(1);
  }

  const payload = JSON.parse(body);
  if (payload.status !== "ok") {
    console.error(`[health:local] status inesperado: ${body}`);
    process.exit(1);
  }

  console.log(`[health:local] OK ${url.href}`);
} catch (error) {
  console.error(`[health:local] falha ao consultar ${url.href}: ${error.message}`);
  process.exit(1);
}
