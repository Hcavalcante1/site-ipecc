/**
 * Auditoria read-only de conteúdo de teste no CMS (staging).
 * Não apaga nem altera dados. Uso: npm run auditar:cms-staging
 */

import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

type Row = Record<string, unknown>;

function refFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "?";
  }
}

function looksLikeTest(row: Row, fields: string[]): boolean {
  for (const f of fields) {
    const v = String(row[f] ?? "").trim();
    if (!v) continue;
    if (/^test\d*$/i.test(v)) return true;
    if (/^teste$/i.test(v)) return true;
    if (/^demo$/i.test(v)) return true;
    if (/\\SBS\\N/i.test(v)) return true;
    if (v.length <= 4 && /^[A-Z0-9\\-]+$/i.test(v) && /test/i.test(v)) return true;
  }
  return false;
}

function printSection(title: string, rows: Row[], labelFields: string[]) {
  console.log(`\n--- ${title} (${rows.length} suspeito(s)) ---`);
  if (!rows.length) {
    console.log("  (nenhum)");
    return;
  }
  for (const r of rows) {
    const id = r.id ?? "?";
    const parts = labelFields
      .map((f) => `${f}=${JSON.stringify(r[f] ?? "")}`)
      .join(" | ");
    console.log(`  • id=${id} ${parts}`);
  }
}

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  console.log("Auditoria CMS staging (read-only)");
  console.log("Projeto:", refFromUrl(url));
  console.log("Confirme no Dashboard: STAGING, não produção.\n");

  const { supabaseAdmin } = await import("../lib/supabaseAdmin");

  const tables: {
    name: string;
    fields: string[];
    filterPublic?: boolean;
  }[] = [
    {
      name: "editais",
      fields: ["titulo", "descricao", "tipo"],
    },
    {
      name: "transparencia_convenios",
      fields: ["titulo", "objeto", "numero_instrumento", "contratado"],
      filterPublic: true,
    },
    {
      name: "transparencia_editais",
      fields: ["titulo", "status_fase", "resultado_preliminar_titulo"],
      filterPublic: true,
    },
    {
      name: "transparencia_prestacao_contas",
      fields: ["titulo", "fase", "tipo_documento"],
      filterPublic: true,
    },
  ];

  let totalSuspeitos = 0;

  for (const t of tables) {
    let q = supabaseAdmin.from(t.name).select("*");
    if (t.filterPublic) {
      q = q.eq("publicado", true);
    }
    const { data, error } = await q;

    if (error) {
      console.error(`ERRO ${t.name}:`, error.message);
      process.exit(1);
    }

    const suspeitos = (data ?? []).filter((row) =>
      looksLikeTest(row as Row, t.fields)
    ) as Row[];

    totalSuspeitos += suspeitos.length;
    printSection(t.name, suspeitos, ["titulo", "objeto", "status_fase"].filter(
      (f) => t.fields.includes(f)
    ));
  }

  const { data: paginas, error: pagErr } = await supabaseAdmin
    .from("paginas_conteudo")
    .select("id, pagina_slug, bloco, titulo, texto")
    .in("pagina_slug", ["projetos", "transparencia", "home"]);

  if (pagErr) {
    console.error("ERRO paginas_conteudo:", pagErr.message);
    process.exit(1);
  }

  const pagSuspeitos = (paginas ?? []).filter((p) => {
    const texto = String(p.texto ?? "");
    const slug = String(p.pagina_slug ?? "");
    const bloco = String(p.bloco ?? "");

    if (slug === "transparencia" && bloco === "hero" && /\bAPECC\b/i.test(texto)) {
      return true;
    }
    if (slug === "projetos" && bloco === "hero" && /unem\s*,\s*cultura/i.test(texto)) {
      return true;
    }
    if (
      slug === "home" &&
      bloco === "cards" &&
      /\bProjetos\s*$/im.test(texto)
    ) {
      return true;
    }
    return false;
  }) as Row[];

  printSection(
    "paginas_conteudo (copy a revisar)",
    pagSuspeitos,
    ["pagina_slug", "bloco", "titulo"]
  );

  console.log("\n=== Resumo ===");
  console.log("Registros publicados suspeitos:", totalSuspeitos);
  console.log("Blocos de copy a revisar:", pagSuspeitos.length);
  console.log("\nRoteiro: docs/CMS-LIMPEZA-STAGING.md");
  console.log("SQL audit: docs/sql/cms-limpeza-staging-AUDIT.sql");

  if (totalSuspeitos > 0) {
    console.log(
      "\nAVISO: há conteúdo de teste publicado. Limpar via admin ou SQL manual antes de go-live."
    );
    process.exit(1);
  }

  console.log("\nOK: nenhum título de teste óbvio publicado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
