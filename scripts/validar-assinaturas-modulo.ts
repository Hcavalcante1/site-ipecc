/**
 * Validação estrutural do módulo Assinatura Simples + Avançada IPECC.
 * Não exige banco; falha se arquivos/contratos essenciais sumirem.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
let falhas = 0;

function ok(msg: string) {
  console.log(`OK  ${msg}`);
}
function fail(msg: string) {
  console.error(`FAIL ${msg}`);
  falhas += 1;
}

function mustExist(rel: string) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) ok(rel);
  else fail(`ausente: ${rel}`);
}

function mustContain(rel: string, needle: string) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`ausente para grep: ${rel}`);
    return;
  }
  const t = fs.readFileSync(p, "utf8");
  if (t.includes(needle)) ok(`${rel} contém "${needle.slice(0, 40)}…"`);
  else fail(`${rel} sem "${needle}"`);
}

console.log("=== validar:assinaturas ===\n");

const docs = [
  "docs/assinaturas/00-INSPECAO-INICIAL.md",
  "docs/assinaturas/01-AUDITORIA-ASSINATURA-SIMPLES.md",
  "docs/assinaturas/02-FLUXO-ASSINATURA-SIMPLES.md",
  "docs/assinaturas/03-ARQUITETURA-COMPARTILHADA.md",
  "docs/assinaturas/04-ARQUITETURA-ASSINATURA-AVANCADA.md",
  "docs/assinaturas/05-MODELO-DE-DADOS.md",
  "docs/assinaturas/06-MODELO-DE-AMEACAS.md",
  "docs/assinaturas/07-PLANO-DE-TESTES.md",
  "docs/assinaturas/08-POLITICA-ASSINATURA-SIMPLES.md",
  "docs/assinaturas/09-POLITICA-ASSINATURA-AVANCADA.md",
  "docs/assinaturas/10-POLITICA-DE-EVIDENCIAS.md",
  "docs/assinaturas/11-POLITICA-DE-IDENTIDADE.md",
  "docs/assinaturas/12-POLITICA-DE-RETENCAO.md",
  "docs/assinaturas/13-PROCEDIMENTO-DE-CONTESTACAO.md",
  "docs/assinaturas/14-MANUAL-OPERACIONAL.md",
  "docs/assinaturas/15-RELATORIO-FINAL.md",
  "docs/sql/gestao-documental-assinatura-ipecc.sql",
  "docs/sql/gestao-documental-assinatura-avancada.sql",
  "docs/sql/gestao-documental-assinatura-certificado.sql",
  "docs/assinaturas/16-ASSINATURA-CERTIFICADO-LOCAL.md",
];
docs.forEach(mustExist);

const code = [
  "lib/documentos/signing/ipeccSignService.ts",
  "lib/documentos/assinaturas/core/types.ts",
  "lib/documentos/assinaturas/core/contracts.ts",
  "lib/documentos/assinaturas/simple/SimpleSignatureProvider.ts",
  "lib/documentos/assinaturas/advanced/AdvancedSignatureProvider.ts",
  "lib/documentos/assinaturas/advanced/advancedSignService.ts",
  "lib/documentos/assinaturas/advanced/batchAdvancedService.ts",
  "lib/documentos/assinaturas/advanced/identityService.ts",
  "lib/documentos/assinaturas/certificate/CertificateSignatureProvider.ts",
  "lib/documentos/assinaturas/certificate/certificateSignService.ts",
  "lib/documentos/assinaturas/certificate/clientCertSign.ts",
  "lib/documentos/assinaturas/shared/crypto.ts",
  "app/api/admin/documentos/assinaturas-avancadas/route.ts",
  "app/api/admin/documentos/lotes-avancados/route.ts",
  "app/api/admin/documentos/assinaturas-certificado/route.ts",
  "app/admin/documentos/components/AssinarAvancadaModal.tsx",
  "app/admin/documentos/components/AssinarLoteAvancadoModal.tsx",
  "app/admin/documentos/components/AssinarComCertificadoModal.tsx",
  "app/validar/[codigo]/page.tsx",
];
code.forEach(mustExist);

mustContain("lib/documentos/assinaturas/core/types.ts", 'SignatureLevel');
mustContain("lib/documentos/assinaturas/core/types.ts", "CERTIFICATE");
mustContain("lib/documentos/assinaturas/shared/crypto.ts", "ed25519");
mustContain("lib/documentos/assinaturas/advanced/batchAdvancedService.ts", "batch_hash_sha256");
mustContain("docs/sql/gestao-documental-assinatura-avancada.sql", "gd_adv_transactions");
mustContain("docs/sql/gestao-documental-assinatura-avancada.sql", "gd_adv_forbid_mutate");
mustContain("docs/sql/gestao-documental-assinatura-certificado.sql", "gd_cert_transactions");
mustContain(
  "lib/documentos/assinaturas/certificate/constants.ts",
  "chave privada não é enviada"
);
mustContain("app/validar/[codigo]/page.tsx", "modalidade");

console.log(`\n=== resultado: ${falhas === 0 ? "APROVADO" : `${falhas} falha(s)`} ===`);
process.exit(falhas === 0 ? 0 : 1);
