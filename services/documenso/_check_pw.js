const { compareSync } = require("@node-rs/bcrypt");
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.NEXT_PRIVATE_DATABASE_URL });
  await c.connect();
  const r = await c.query('SELECT password FROM "User" WHERE email=$1', ['admin-documento@ipecc.local']);
  const ok = compareSync(process.env.DOC_PASS, r.rows[0].password);
  console.log("compare=" + ok);
  await c.end();
})().catch(e => { console.error("err="+e.message); process.exit(1); });
