const fs = require("fs");
const path = require("path");

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const r = await fetch(
    url + "/rest/v1/digital_agents?select=agent_id&limit=1",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  console.log("status", r.status);
  console.log("body", (await r.text()).slice(0, 400));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
