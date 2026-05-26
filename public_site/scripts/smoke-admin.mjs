const baseUrl = process.env.LOCAL_BASE_URL || "http://localhost:3000";
const adminUrl = new URL("/admin", baseUrl);

try {
  const response = await fetch(adminUrl, { redirect: "manual" });
  const location = response.headers.get("location") || "";

  if (![307, 308, 301, 302].includes(response.status)) {
    console.error(`[smoke:admin] esperado redirect para login, recebido HTTP ${response.status}`);
    process.exit(1);
  }

  if (!location.includes("/login")) {
    console.error(`[smoke:admin] redirect inesperado: ${location || "(sem Location)"}`);
    process.exit(1);
  }

  console.log(`[smoke:admin] OK redirect protegido para ${location}`);
} catch (error) {
  console.error(`[smoke:admin] falha ao consultar ${adminUrl.href}: ${error.message}`);
  process.exit(1);
}
