const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3050";

const publicRoutes = ["/", "/quem-somos", "/projetos", "/transparencia", "/contato"];
const protectedAdminRoutes = ["/admin", "/admin/noticias", "/admin/eventos", "/admin/banners", "/admin/galeria"];

async function assertPublicRoute(route) {
  const response = await fetch(`${baseUrl}${route}`);
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`${route}: esperado HTTP 200, recebido ${response.status}`);
  }

  if (!body.includes("<main") && !body.includes("__next")) {
    throw new Error(`${route}: HTML inesperado`);
  }

  console.log(`${route}: HTTP ${response.status}`);
}

async function assertAdminGuard(route) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const location = response.headers.get("location") || "";

  if (![307, 308].includes(response.status)) {
    throw new Error(`${route}: esperado redirect de protecao, recebido HTTP ${response.status}`);
  }

  if (!location.includes("/login")) {
    throw new Error(`${route}: redirect inesperado para ${location}`);
  }

  console.log(`${route}: HTTP ${response.status} -> ${location}`);
}

for (const route of publicRoutes) {
  await assertPublicRoute(route);
}

for (const route of protectedAdminRoutes) {
  await assertAdminGuard(route);
}

console.log("smoke:local OK");
