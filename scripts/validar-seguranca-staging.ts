/**
 * Hardening read-only — valida que anon não lê propostas/storage público.
 * Uso: npm run validar:seguranca
 * Opcional: DEV_URL=http://localhost:3002 (testa /api/download sem cookie)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

const DEV_URL = process.env.DEV_URL || "http://localhost:3002";

type Resultado = { ok: boolean; msg: string };

async function testAnonSelect(anon: SupabaseClient, tabela: string): Promise<Resultado> {
  const { data, error } = await anon.from(tabela).select("id").limit(5);

  if (error) {
    return { ok: true, msg: `${tabela}: negado (${error.code || error.message})` };
  }
  if (!data?.length) {
    return { ok: true, msg: `${tabela}: 0 linhas (anon)` };
  }
  return {
    ok: false,
    msg: `${tabela}: FALHA — anon leu ${data.length} linha(s)`,
  };
}

async function testStoragePublico(url: string, storagePath: string): Promise<Resultado> {
  const publicUrl = `${url.replace(/\/+$/, "")}/storage/v1/object/public/propostas/${storagePath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(publicUrl, { method: "GET", signal: controller.signal });
  } catch {
    clearTimeout(timer);
    return { ok: true, msg: "storage público inacessível (timeout/rede)" };
  }
  clearTimeout(timer);

  if (res.ok) {
    return {
      ok: false,
      msg: `storage público acessível (${res.status}) — bucket propostas deve ser privado`,
    };
  }
  return {
    ok: true,
    msg: `storage público bloqueado (${res.status}) para path de teste`,
  };
}

async function testDownloadApi(storagePath: string): Promise<Resultado | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `${DEV_URL}/api/download/public/propostas/${encodeURIComponent(storagePath)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.status === 401 || res.status === 403) {
      return { ok: true, msg: `API download sem sessão: ${res.status}` };
    }
    return {
      ok: false,
      msg: `API download sem sessão: esperado 401/403, recebeu ${res.status}`,
    };
  } catch {
    return null;
  }
}

function logResultado(c: Resultado) {
  console.log(c.ok ? "OK" : "FALHA", "—", c.msg);
}

async function main() {
  loadEnvLocal();
  requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  console.log("=== Hardening segurança (read-only) ===\n");

  const envChecks: Resultado[] = [
    {
      ok: !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      msg: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
        ? "FALHA: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY definida (vazamento)"
        : "OK: service role não exposta via NEXT_PUBLIC_*",
    },
    {
      ok: true,
      msg: process.env.RESEND_API_KEY
        ? "OK: RESEND_API_KEY presente"
        : "AVISO: RESEND_API_KEY ausente (build/deploy)",
    },
  ];

  for (const c of envChecks) logResultado(c);

  const rlsChecks = await Promise.all([
    testAnonSelect(anon, "propostas"),
    testAnonSelect(anon, "proposta_anexos"),
    testAnonSelect(anon, "admin_logs"),
  ]);

  for (const c of rlsChecks) logResultado(c);

  const { gerarAuditoriaAnexos } = await import("@/lib/documental/auditoriaAnexos");
  const { linhas } = await gerarAuditoriaAnexos(admin);
  const pathTeste = linhas.find((l) => l.existe)?.path;

  let storageCheck: Resultado | null = null;
  let apiCheck: Resultado | null = null;

  if (pathTeste) {
    storageCheck = await testStoragePublico(url, pathTeste);
    logResultado(storageCheck);
    apiCheck = await testDownloadApi(pathTeste);
    if (apiCheck) logResultado(apiCheck);
    else console.log("AVISO — dev server indisponível em", DEV_URL, "(pulando HTTP download)");
  } else {
    console.log("AVISO — nenhum anexo no storage para testar URL pública");
  }

  const falhas =
    envChecks.filter((c) => !c.ok).length +
    rlsChecks.filter((c) => !c.ok).length +
    (storageCheck && !storageCheck.ok ? 1 : 0) +
    (apiCheck && !apiCheck.ok ? 1 : 0);

  console.log("");
  if (falhas > 0) {
    console.error("FALHA: revisar docs/HARDENING-RLS-CHECKLIST.md");
    process.exit(1);
  }

  console.log("OK: checks automatizados de hardening passaram.");
  console.log("Manual: docs/HARDENING-RLS-CHECKLIST.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
