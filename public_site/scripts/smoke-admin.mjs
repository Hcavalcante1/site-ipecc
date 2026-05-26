const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const routes = [
  "/admin",
  "/admin/editais",
  "/admin/propostas",
  "/admin/paginas",
  "/admin/repositorios",
];

const headers = {
  Cookie: "sb-access-token=local-smoke",
};

const errors = [];

for (const route of routes) {
  const url = new URL(route, baseUrl).href;
  try {
    const response = await fetch(url, { headers, redirect: "manual" });
    if (response.status >= 500) {
      errors.push(`${route} returned HTTP ${response.status}`);
      continue;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") || "";
      errors.push(`${route} redirected unexpectedly to ${location || "(empty location)"}`);
    }
  } catch (error) {
    errors.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length > 0) {
  console.error("Admin smoke failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Admin smoke passed (${routes.length} routes).`);
