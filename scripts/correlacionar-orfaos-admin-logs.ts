/**
 * Fase 8 — Correlaciona anexos órfãos com admin_logs e logs_download (read-only).
 * Uso: npm run correlacionar:orfaos-logs
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

type AdminLogRow = {
  id: string;
  user_email: string;
  acao: string;
  tabela: string;
  registro_id: string | null;
  detalhes: unknown;
  created_at: string;
};

type DownloadLogRow = {
  id: string;
  bucket: string | null;
  file_path: string | null;
  status: number | null;
  status_text: string | null;
  created_at: string;
};

function textoLog(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "string") return valor;
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

function batePath(haystack: string, path: string): boolean {
  if (!haystack || !path) return false;
  return haystack.includes(path) || path.includes(haystack);
}

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { gerarAuditoriaAnexos } = await import("@/lib/documental/auditoriaAnexos");
  const { linhas, resumo } = await gerarAuditoriaAnexos(admin);
  const orfaos = linhas.filter((l) => !l.existe);

  console.log(`Propostas: ${resumo.propostas}`);
  console.log(`Referências: ${resumo.referencias}`);
  console.log(`Órfãos: ${orfaos.length}`);

  if (orfaos.length === 0) {
    console.log("OK: nenhum órfão — correlação não necessária.");
    return;
  }

  const [{ data: adminLogs }, { data: downloadLogs }] = await Promise.all([
    admin
      .from("admin_logs")
      .select("id, user_email, acao, tabela, registro_id, detalhes, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("logs_download")
      .select("id, bucket, file_path, status, status_text, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const logs = (adminLogs || []) as AdminLogRow[];
  const downloads = (downloadLogs || []) as DownloadLogRow[];

  for (const o of orfaos) {
    console.log("");
    console.log(`— ${o.label} | path: ${o.path}`);
    console.log(`  proposta: ${o.proposta_id} (${o.nome})`);

    const matchAdmin = logs.filter(
      (log) =>
        log.registro_id === o.proposta_id ||
        (log.tabela === "propostas" &&
          (batePath(textoLog(log.detalhes), o.path) ||
            textoLog(log.detalhes).includes(o.proposta_id)))
    );

    const matchDownload = downloads.filter((d) =>
      batePath(String(d.file_path || ""), o.path)
    );

    if (matchAdmin.length === 0) {
      console.log("  admin_logs: (sem match nos últimos 500)");
    } else {
      for (const log of matchAdmin.slice(0, 3)) {
        console.log(
          `  admin_logs: ${log.acao} ${log.tabela} @ ${log.created_at} — ${log.user_email}`
        );
      }
    }

    if (matchDownload.length === 0) {
      console.log("  logs_download: (sem match nos últimos 500)");
    } else {
      for (const d of matchDownload.slice(0, 3)) {
        console.log(
          `  logs_download: status ${d.status ?? "?"} @ ${d.created_at} — ${d.file_path}`
        );
      }
    }
  }

  console.log("");
  console.log(
    "Dica: substituir anexo via /admin/propostas/[id] grava admin_logs (substituir_anexo)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
