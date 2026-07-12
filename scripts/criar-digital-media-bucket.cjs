/**
 * Cria bucket digital-media (privado) via Storage API.
 * Uso: node scripts/criar-digital-media-bucket.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const list = await sb.storage.listBuckets();
  if (list.error) {
    console.error("listBuckets:", list.error.message);
    process.exit(1);
  }
  console.log(
    "buckets:",
    (list.data || []).map((b) => b.name).join(", ") || "(nenhum)"
  );

  if ((list.data || []).some((b) => b.name === "digital-media")) {
    console.log("OK bucket digital-media já existe.");
    return;
  }

  const { data, error } = await sb.storage.createBucket("digital-media", {
    public: false,
    fileSizeLimit: 52428800,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
    ],
  });

  if (error) {
    console.error("FAIL:", error.message);
    process.exit(1);
  }
  console.log("OK criado:", data?.name || "digital-media");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
