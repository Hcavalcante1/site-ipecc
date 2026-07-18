const { Client } = require("pg");

const ref = "eohshxaxbsdpxundsley";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("missing password");
  process.exit(1);
}

const regions = [
  "us-west-2",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "sa-east-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
];

const enc = encodeURIComponent(password);

(async () => {
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const cs = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:${port}/postgres`;
      const client = new Client({
        connectionString: cs,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      try {
        await client.connect();
        console.log("OK", region, port);
        await client.end();
        process.exit(0);
      } catch (e) {
        console.log("FAIL", region, port, e.message);
        try {
          await client.end();
        } catch {}
      }
    }
  }
  process.exit(1);
})();
