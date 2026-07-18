const { Client } = require("pg");

const ref = "eohshxaxbsdpxundsley";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD missing");
  process.exit(1);
}

const regions = [
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "ca-central-1",
];

async function tryOne(label, connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log("OK", label);
    await client.end();
    return true;
  } catch (e) {
    console.log("FAIL", label, e.message);
    try {
      await client.end();
    } catch {}
    return false;
  }
}

(async () => {
  const enc = encodeURIComponent(password);
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const cs = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:${port}/postgres`;
      const ok = await tryOne(`${region}:${port}`, cs);
      if (ok) {
        process.exit(0);
      }
    }
  }
  // also try user postgres without project prefix on pooler
  for (const region of ["sa-east-1", "us-east-1", "us-east-2"]) {
    const cs = `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`;
    // skip - ipv6 only
    const cs2 = `postgresql://postgres:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    if (await tryOne(`postgres@${region}:6543`, cs2)) process.exit(0);
  }
  process.exit(1);
})();
