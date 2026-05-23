/**
 * Gate automatizado de release prep (staging/local).
 * Não altera produção. Uso: npm run validar:release-prep
 */

import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import {
  assinaturaAnexos,
  carregarAnexosTabelaPorPropostas,
  usePropostaAnexosSomenteTabela,
  usePropostaAnexosTableLeitura,
} from "@/lib/documental/propostaAnexosHibrido";
import { usePropostaAnexosTableEscrita } from "@/lib/documental/propostaAnexosEscrita";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

function refFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "?";
  }
}

function flag(name: string): string {
  const v = process.env[name];
  return v === "true" || v === "1" ? "ON" : "off";
}

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  console.log("=== Release prep (automático) ===\n");
  console.log("Supabase ref:", refFromUrl(url));
  console.log("Confirme no Dashboard: staging vs produção.\n");

  console.log("Flags (.env.local):");
  console.log("  USE_PROPOSTA_ANEXOS_TABLE:", flag("USE_PROPOSTA_ANEXOS_TABLE"));
  console.log(
    "  USE_PROPOSTA_ANEXOS_ESCRITA:",
    flag("USE_PROPOSTA_ANEXOS_ESCRITA")
  );
  console.log(
    "  USE_PROPOSTA_ANEXOS_SOMENTE_TABELA:",
    flag("USE_PROPOSTA_ANEXOS_SOMENTE_TABELA")
  );
  console.log(
    "  (leitura híbrida ativa:",
    usePropostaAnexosTableLeitura() ? "sim" : "não",
    "| escrita:",
    usePropostaAnexosTableEscrita() ? "sim" : "não",
    "| somente-tabela:",
    usePropostaAnexosSomenteTabela() ? "sim" : "não",
    ")\n"
  );

  console.log("> npm run typecheck");
  execSync("npm run typecheck", { stdio: "inherit" });

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const probe = await admin.from("proposta_anexos").select("id").limit(1);
  if (probe.error) {
    console.error("FALHA: proposta_anexos —", probe.error.message);
    process.exit(1);
  }

  const { gerarAuditoriaAnexos } = await import("@/lib/documental/auditoriaAnexos");
  const { linhas, resumo } = await gerarAuditoriaAnexos(admin);

  const { count: linhasTabela } = await admin
    .from("proposta_anexos")
    .select("id", { count: "exact", head: true })
    .eq("status", "ativo");

  console.log("\nAuditoria:");
  console.log("  propostas:", resumo.propostas);
  console.log("  referências:", resumo.referencias);
  console.log("  órfãos:", resumo.orfaos);
  console.log("  proposta_anexos (ativo):", linhasTabela ?? 0);

  if (resumo.orfaos > 0) {
    console.error("\nFALHA: corrija órfãos (npm run audit:anexos).");
    process.exit(1);
  }

  if ((linhasTabela ?? 0) < resumo.referencias) {
    console.error("\nFALHA: gap tabela vs audit — npm run sync:proposta-anexos");
    process.exit(1);
  }

  const { data: propostas } = await admin.from("propostas").select("id, nome");
  const ids = (propostas || []).map((p) => String(p.id));
  const porTabela = await carregarAnexosTabelaPorPropostas(admin, ids);

  let divergencias = 0;
  for (const p of propostas || []) {
    const id = String(p.id);
    const row = await admin.from("propostas").select("*").eq("id", id).single();
    if (row.error || !row.data) continue;
    const legado = extrairAnexosProposta(row.data as Record<string, unknown>);
    const tabela = porTabela.get(id) || [];
    if (assinaturaAnexos(legado) !== assinaturaAnexos(tabela)) {
      divergencias++;
    }
  }

  if (divergencias > 0) {
    console.error(
      `\nFALHA: ${divergencias} proposta(s) com legado ≠ tabela — validar:pre-m4-corte`
    );
    process.exit(1);
  }

  const orfaos = linhas.filter((l) => !l.existe);
  if (orfaos.length > 0) {
    console.log(
      `\nAVISO: ${orfaos.length} órfão(s) — rode npm run correlacionar:orfaos-logs`
    );
  }

  console.log("\nOK: gate automatizado passou.");
  console.log("Manual: docs/PROD-PREP-CHECKLIST.md (Supabase prod + deploy + flags).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
