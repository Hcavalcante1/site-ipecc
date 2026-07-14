/**
 * Envia variáveis de assinatura do .env.local para Vercel (production + preview).
 * Uso: node scripts/push-assinatura-env-vercel.cjs
 */
const fs = require("fs");
const { spawnSync } = require("child_process");

const t = fs.readFileSync(".env.local", "utf8");
function get(k) {
  const m = t.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

const vars = [
  "SIGNATURE_OTP_PEPPER",
  "SIGNATURE_ADV_KEY_VERSION",
  "SIGNATURE_ADV_PRIVATE_KEY_PEM",
  "SIGNATURE_ADV_PUBLIC_KEY_PEM",
  "SIGNATURE_OTP_ALLOW_PANEL_FALLBACK",
];

for (const k of vars) {
  const v = get(k);
  if (!v) {
    console.log("SKIP", k);
    continue;
  }
  for (const envName of ["production", "preview"]) {
    const r = spawnSync(
      "npx",
      ["--yes", "vercel", "env", "add", k, envName, "--force"],
      { input: `${v}\n`, encoding: "utf8", shell: true }
    );
    const out = `${r.stdout || ""}\n${r.stderr || ""}`;
    const ok =
      r.status === 0 || /Updated|Added|Created|Saved|Overrode/i.test(out);
    const tail = out
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-2)
      .join(" | ");
    console.log(ok ? "OK" : "FAIL", k, envName, tail);
  }
}
