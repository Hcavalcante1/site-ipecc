const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const checks = [
  { path: "/login", expected: [200] },
  { path: "/admin", expected: [200, 307, 308] },
];

const failures = [];

for (const check of checks) {
  const url = new URL(check.path, baseUrl);
  try {
    const response = await fetch(url, { redirect: "manual" });
    if (!check.expected.includes(response.status)) {
      failures.push(`${check.path}: HTTP ${response.status}, esperado ${check.expected.join("/")}`);
    }
  } catch (error) {
    failures.push(`${check.path}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("Smoke admin falhou:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Smoke admin concluído.");
