const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const ref = "eohshxaxbsdpxundsley";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD missing");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, "../docs/sql/transparencia-modulo-ciclo-fase-1.sql"),
  "utf8"
);

const enc = encodeURIComponent(password);
const tries = [
  `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
];

(async () => {
  for (const cs of tries) {
    const label = cs.replace(/:[^:@/]+@/, ":****@");
    const client = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    try {
      console.log("Tentando", label);
      await client.connect();
      console.log("conectado");
      await client.query(sql);
      console.log("OK: SQL transparencia-modulo-ciclo-fase-1 aplicado.");
      await client.end();
      process.exit(0);
    } catch (e) {
      console.error("FAIL:", e.message);
      try {
        await client.end();
      } catch {}
    }
  }
  process.exit(1);
})();
