/**
 * Validação Gestão Documental — Fases 1–3 + Assinatura IPECC (A–F).
 * Uso: npm run validar:documentos
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";
import {
  GD_DEFAULT_WORKFLOW_STEPS,
  GD_DOCUMENT_STATUSES,
  GD_PERMISSIONS,
  GD_STORAGE_BUCKET,
  GD_TEMPLATE_KINDS,
  contarDashboard,
  isGdDocumentStatus,
  isGdPermission,
  isGdTemplateKind,
  normalizarTag,
  previewKindFromMime,
  slugify,
  validarArquivoGestaoDocumental,
  validarTituloDocumento,
} from "../lib/documentos";
import {
  getSignatureProvider,
  listSignatureProviderCodes,
} from "../lib/documentos/signature";
import { MODULOS_MESTRE } from "../lib/auth/adminEscopo";
import { requestAuditMeta } from "../lib/documentos/auditMeta";
import { NAV_GESTAO_DOCUMENTAL } from "../lib/documentos/labels";

let ok = 0;
let fail = 0;

function assert(name: string, cond: boolean) {
  if (cond) ok++;
  else {
    fail++;
    console.error("FALHA:", name);
  }
}

function existe(...parts: string[]) {
  return fs.existsSync(path.join(process.cwd(), ...parts));
}

async function validarSupabaseRemoto() {
  try {
    loadEnvLocal({
      keys: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    });
  } catch {
    console.log("AVISO: .env.local ausente — pulando checagem remota.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("AVISO: sem service role — pulando checagem remota.");
    return;
  }

  const admin = createClient(url, key);
  const tabelas = [
    "gd_folders",
    "gd_categories",
    "gd_documents",
    "gd_document_workflows",
    "gd_workflow_steps",
    "gd_document_permissions",
    "gd_signature_providers",
    "gd_signature_batches",
    "gd_oauth_states",
    "gd_notifications",
  ];

  for (const tabela of tabelas) {
    const coluna = tabela === "gd_oauth_states" ? "state" : "id";
    const { error } = await admin
      .from(tabela)
      .select(coluna, { head: true, count: "exact" });
    assert(`tabela ${tabela}`, !error);
    if (error) console.error("  ->", error.message);
  }

  const escopo = await admin
    .from("admin_escopos")
    .select("mod_documentos")
    .limit(1);
  assert(
    "coluna mod_documentos",
    !escopo.error || !/mod_documentos|column .* does not exist/i.test(escopo.error.message || "")
  );
  if (escopo.error) console.error("  ->", escopo.error.message);

  const { counts, aviso } = await contarDashboard("todos");
  assert("dashboard sem aviso tabelas", !aviso?.includes("Tabelas da Gestão Documental ausentes"));
  if (aviso) console.error("  aviso dashboard:", aviso);
  assert("dashboard counts objeto", typeof counts.ativos === "number");

  const provider = await admin
    .from("gd_signature_providers")
    .select("code")
    .eq("code", "ipecc")
    .maybeSingle();
  assert(
    "provider ipecc seed",
    !provider.error || provider.data?.code === "ipecc"
  );

  for (const tabela of [
    "gd_signature_evidences",
    "gd_signature_otp_challenges",
    "gd_validation_lookups",
  ]) {
    const { error } = await admin
      .from(tabela)
      .select("id", { head: true, count: "exact" });
    if (error && /does not exist|42P01/i.test(error.message || "")) {
      console.log(
        `AVISO: tabela ${tabela} ausente — aplique gestao-documental-assinatura-ipecc.sql`
      );
    } else {
      assert(`tabela ${tabela}`, !error);
      if (error) console.error("  ->", error.message);
    }
  }
}

async function main() {
  assert("modulo documentos no mestre", MODULOS_MESTRE.includes("documentos"));
  assert("8 status", GD_DOCUMENT_STATUSES.length === 8);
  assert("status draft", isGdDocumentStatus("draft"));
  assert("6 permissions", GD_PERMISSIONS.length === 6);
  assert("perm gestor", isGdPermission("gestor"));
  assert("passos padrao", GD_DEFAULT_WORKFLOW_STEPS.length >= 6);
  assert(
    "passo 1 draft->review",
    GD_DEFAULT_WORKFLOW_STEPS[0].from_status === "draft" &&
      GD_DEFAULT_WORKFLOW_STEPS[0].to_status === "in_review"
  );

  assert("titulo ok", validarTituloDocumento("Contrato") === "Contrato");
  assert("slug", slugify("Plano de Trabalho") === "plano-de-trabalho");
  assert("tag ok", normalizarTag(" Contrato 2026 ") === "contrato-2026");
  assert("preview pdf", previewKindFromMime("application/pdf") === "pdf");
  assert("kind ata", isGdTemplateKind("ata"));
  assert("tipos modelo", GD_TEMPLATE_KINDS.includes("contrato"));
  assert("bucket", GD_STORAGE_BUCKET === "gestao-documental");

  const arqOk = validarArquivoGestaoDocumental({
    fileName: "contrato.pdf",
    mimeType: "application/pdf",
    size: 1024,
  });
  assert("arquivo pdf", arqOk.ok === true);

  const meta = requestAuditMeta(
    new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "user-agent": "IPECC-Test/1.0",
      },
    })
  );
  assert("audit ip", meta.ip === "203.0.113.10");
  assert("audit ua", meta.user_agent === "IPECC-Test/1.0");

  assert(
    "provider documento",
    listSignatureProviderCodes().includes("documento")
  );
  assert("provider ipecc", listSignatureProviderCodes().includes("ipecc"));
  assert(
    "provider documento code",
    getSignatureProvider("documento").code === "documento"
  );
  assert(
    "provider ipecc code",
    getSignatureProvider("ipecc").code === "ipecc"
  );
  assert(
    "nav notificacoes",
    NAV_GESTAO_DOCUMENTAL.some((i) => i.href.includes("/notificacoes"))
  );

  assert("sql fase1", existe("docs", "sql", "gestao-documental-fase-1.sql"));
  assert("sql fase3", existe("docs", "sql", "gestao-documental-fase-3.sql"));
  assert("sql fase4-6", existe("docs", "sql", "gestao-documental-fase-4-6.sql"));
  assert(
    "sql assinatura ipecc",
    existe("docs", "sql", "gestao-documental-assinatura-ipecc.sql")
  );
  assert(
    "sql provedor documento",
    existe("docs", "sql", "gestao-documental-documenso.sql")
  );
  assert(
    "provider ipecc file",
    existe("lib", "documentos", "signature", "IpeccProvider.ts")
  );
  assert(
    "signing otp service",
    existe("lib", "documentos", "signing", "otpService.ts")
  );
  assert(
    "validar page",
    existe("app", "validar", "[codigo]", "page.tsx")
  );
  assert(
    "provider documento file",
    existe("lib", "documentos", "signature", "DocumentoProvider.ts")
  );
  assert(
    "webhook documento",
    existe("app", "api", "webhooks", "documento", "route.ts")
  );
  assert(
    "motor compose",
    existe("services", "documenso", "docker-compose.yml")
  );
  assert("docs fase3", existe("docs", "gestao-documental-fase-3.md"));
  assert("docs fase4-6", existe("docs", "gestao-documental-fase-4-6.md"));
  assert("fluxos page", existe("app", "admin", "documentos", "fluxos", "page.tsx"));
  assert(
    "assinaturas page",
    existe("app", "admin", "documentos", "assinaturas", "page.tsx")
  );
  assert("lotes page", existe("app", "admin", "documentos", "lotes", "page.tsx"));
  assert(
    "signatarios page",
    existe("app", "admin", "documentos", "signatarios", "page.tsx")
  );
  assert(
    "notificacoes page",
    existe("app", "admin", "documentos", "notificacoes", "page.tsx")
  );
  assert(
    "docs fechamento",
    existe("docs", "gestao-documental-fechamento.md")
  );
  assert(
    "shell placeholder removido",
    !existe("app", "admin", "documentos", "components", "ShellPlaceholder.tsx")
  );
  assert(
    "api assinaturas",
    existe("app", "api", "admin", "documentos", "assinaturas", "route.ts")
  );
  assert(
    "api authorize",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "assinaturas",
      "authorize",
      "route.ts"
    )
  );
  assert(
    "api enviar lote",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "lotes",
      "[id]",
      "enviar",
      "route.ts"
    )
  );
  assert(
    "api enviar documento",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "assinaturas",
      "[id]",
      "enviar",
      "route.ts"
    )
  );
  assert(
    "api signatarios",
    existe("app", "api", "admin", "documentos", "signatarios", "route.ts")
  );
  assert(
    "api notificacoes",
    existe("app", "api", "admin", "documentos", "notificacoes", "route.ts")
  );
  assert(
    "api fluxos",
    existe("app", "api", "admin", "documentos", "fluxos", "route.ts")
  );
  assert(
    "api transicao",
    existe("app", "api", "admin", "documentos", "[id]", "transicao", "route.ts")
  );
  assert(
    "api permissoes",
    existe("app", "api", "admin", "documentos", "[id]", "permissoes", "route.ts")
  );
  assert(
    "api passos",
    existe("app", "api", "admin", "documentos", "fluxos", "passos", "route.ts")
  );

  // Fase F — robustez (rate limit, evidências, laudo)
  assert(
    "signing rateLimit",
    existe("lib", "documentos", "signing", "rateLimit.ts")
  );
  assert(
    "signing laudoService",
    existe("lib", "documentos", "signing", "laudoService.ts")
  );
  assert(
    "api evidencias",
    existe("app", "api", "admin", "documentos", "evidencias", "route.ts")
  );
  assert(
    "api laudo",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "evidencias",
      "[id]",
      "laudo",
      "route.ts"
    )
  );
  assert(
    "api ipecc iniciar",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "assinaturas",
      "[id]",
      "ipecc",
      "iniciar",
      "route.ts"
    )
  );
  assert(
    "api ipecc confirmar",
    existe(
      "app",
      "api",
      "admin",
      "documentos",
      "assinaturas",
      "[id]",
      "ipecc",
      "confirmar",
      "route.ts"
    )
  );
  assert(
    "api validar publico",
    existe("app", "api", "public", "validar", "[codigo]", "route.ts")
  );
  assert(
    "auditoria page",
    existe("app", "admin", "documentos", "auditoria", "page.tsx")
  );

  const rateSrc = fs.readFileSync(
    path.join(process.cwd(), "lib", "documentos", "signing", "rateLimit.ts"),
    "utf8"
  );
  assert("rateLimit checkRateLimit", rateSrc.includes("checkRateLimit"));
  assert(
    "rateLimit validar publico key",
    rateSrc.includes("validarPublicoRateKey")
  );

  const laudoSrc = fs.readFileSync(
    path.join(process.cwd(), "lib", "documentos", "signing", "laudoService.ts"),
    "utf8"
  );
  assert("laudo gerarLaudoTexto", laudoSrc.includes("gerarLaudoTexto"));
  assert("laudo gerarLaudoCsv", laudoSrc.includes("gerarLaudoCsv"));
  assert(
    "laudo listarEvidencias",
    laudoSrc.includes("listarEvidenciasAssinatura")
  );

  const validarApi = fs.readFileSync(
    path.join(
      process.cwd(),
      "app",
      "api",
      "public",
      "validar",
      "[codigo]",
      "route.ts"
    ),
    "utf8"
  );
  assert("validar usa rate limit", validarApi.includes("checkRateLimit"));

  const auditoriaPage = fs.readFileSync(
    path.join(
      process.cwd(),
      "app",
      "admin",
      "documentos",
      "auditoria",
      "page.tsx"
    ),
    "utf8"
  );
  assert(
    "auditoria lista evidencias",
    auditoriaPage.includes("/api/admin/documentos/evidencias")
  );
  assert(
    "auditoria baixar laudo",
    auditoriaPage.includes("/laudo")
  );

  await validarSupabaseRemoto();

  console.log(`OK: ${ok} | FALHAS: ${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Falha validar documentos:", err?.message || err);
  process.exit(1);
});
