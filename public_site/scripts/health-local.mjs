const baseUrl = process.env.LOCAL_BASE_URL || "http://localhost:3000";
const url = new URL("/api/health", baseUrl);

try {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Health local falhou: HTTP ${response.status}`);
    process.exit(1);
  }

  console.log(`Health local OK: ${url.href}`);
} catch (error) {
  console.error(`Health local indisponivel em ${url.href}: ${error.message}`);
  process.exit(1);
}
