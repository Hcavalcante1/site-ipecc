const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3050";

const checks = [
  { path: "/", statuses: [200] },
  { path: "/quem-somos", statuses: [200] },
  { path: "/projetos", statuses: [200] },
  { path: "/editais", statuses: [200] },
  { path: "/transparencia", statuses: [200] },
  { path: "/contato", statuses: [200] },
  { path: "/login", statuses: [200] },
  { path: "/admin", statuses: [200, 307, 308] },
];

const failures = [];

for (const check of checks) {
  const url = new URL(check.path, baseUrl);
  let response;

  try {
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    failures.push(`${check.path}: request failed (${error.message})`);
    continue;
  }

  const status = response.status;
  const ok = check.statuses.includes(status);
  console.log(`${ok ? "OK" : "FAIL"} ${status} ${check.path}`);

  if (!ok) {
    failures.push(`${check.path}: expected ${check.statuses.join("/")} got ${status}`);
  }
}

if (failures.length > 0) {
  console.error("\nSmoke failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
