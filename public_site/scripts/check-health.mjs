import process from "node:process";

const url = process.env.HEALTH_URL ?? "http://localhost:3000/api/health";

try {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.status !== "ok" || body.service !== "apecc-site") {
    throw new Error("Resposta de healthcheck invalida");
  }

  console.log(`Healthcheck ok: ${url}`);
} catch (error) {
  console.error(`Healthcheck falhou (${url}): ${error.message}`);
  process.exit(1);
}
