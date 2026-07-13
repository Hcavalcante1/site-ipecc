/**
 * Validação Gestão Documental — Fases 1–3.
 * Uso: npm run validar:documentos
 */

import fs from "fs";
import path from "path";
import {
  GD_DEFAULT_WORKFLOW_STEPS,
  GD_DOCUMENT_STATUSES,
  GD_PERMISSIONS,
  GD_STORAGE_BUCKET,
  GD_TEMPLATE_KINDS,
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

function main() {
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

  assert("provider govbr", listSignatureProviderCodes().includes("govbr"));
  assert("provider code", getSignatureProvider("govbr").code === "govbr");

  assert("sql fase1", existe("docs", "sql", "gestao-documental-fase-1.sql"));
  assert("sql fase3", existe("docs", "sql", "gestao-documental-fase-3.sql"));
  assert("docs fase3", existe("docs", "gestao-documental-fase-3.md"));
  assert("fluxos page", existe("app", "admin", "documentos", "fluxos", "page.tsx"));
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

  console.log(`OK: ${ok} | FALHAS: ${fail}`);
  if (fail > 0) process.exit(1);
}

main();
