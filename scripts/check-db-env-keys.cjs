const fs = require("fs");
function load(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
load(".env.local");
for (const k of [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_DB_PASSWORD",
  "POSTGRES_PASSWORD",
  "NEXT_PUBLIC_SUPABASE_URL",
]) {
  const v = process.env[k];
  console.log(k + ":", v ? "set len=" + String(v).length : "absent");
}
