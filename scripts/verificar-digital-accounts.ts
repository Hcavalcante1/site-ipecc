import fs from "fs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }

  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await s
    .from("digital_accounts")
    .select("platform,label,ativo")
    .eq("scope", "site")
    .order("platform");

  if (error) {
    console.error("ERRO:", error.message);
    process.exit(1);
  }
  console.log("Contas site:", data?.length ?? 0);
  for (const row of data ?? []) {
    console.log("-", row.platform, row.label, row.ativo ? "ativo" : "off");
  }
}

main();
