const fs = require("fs");
const p = ".env.local";
if (!fs.existsSync(p)) {
  console.log("NO .env.local");
  process.exit(1);
}
const keys = [];
for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const m = t.match(/^([A-Za-z0-9_]+)\s*=/);
  if (m) keys.push(m[1]);
}
console.log("keys matching password/db/postgres/database/url:");
for (const k of keys) {
  if (/pass|db|postgres|database|direct|pooler|supabase/i.test(k)) {
    console.log("-", k);
  }
}
console.log("all_keys_count", keys.length);
