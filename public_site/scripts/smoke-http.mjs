const baseUrl = process.env.LOCAL_BASE_URL || "http://localhost:3000";
const mode = process.argv[2] || "site";
const routes =
  mode === "admin"
    ? ["/login"]
    : ["/", "/quem-somos", "/projetos", "/editais", "/transparencia", "/contato", "/propostas"];

const errors = [];

for (const route of routes) {
  const url = new URL(route, baseUrl);
  try {
    const response = await fetch(url, { redirect: "manual" });
    const acceptableRedirect = mode === "admin" && response.status >= 300 && response.status < 400;
    if (!response.ok && !acceptableRedirect) {
      errors.push(`${route}: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`${route}: ${error.message}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERRO smoke ${mode}: ${error}`);
  process.exit(1);
}

console.log(`Smoke ${mode} OK em ${baseUrl}`);
