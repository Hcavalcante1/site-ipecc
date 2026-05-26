/**
 * Oculta convênios de teste e corrige copy de hero no CMS (staging).
 * Uso: npm run limpar:cms-staging          (dry-run)
 *      npm run limpar:cms-staging -- --apply
 */

import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

const CONVENIO_IDS = [
  "6e2d99c7-e9ee-415e-866e-0c9ca648ad99",
  "c4ad00cc-d5fc-4619-b554-d2c5f5f3b480",
];

const PAGINA_IDS = [
  "24397d6c-a6af-408e-8b61-89c3d5a80279",
  "cb1fc875-6c43-4a67-b081-e16c379bc31e",
];

type PaginaRow = {
  id: string;
  titulo: string | null;
  texto: string | null;
  pagina_slug: string | null;
  bloco: string | null;
};

function fixPaginaCopy(row: PaginaRow): { titulo?: string; texto?: string } {
  const patch: { titulo?: string; texto?: string } = {};

  if (typeof row.titulo === "string") {
    const trimmed = row.titulo.trim();
    if (trimmed !== row.titulo) patch.titulo = trimmed;
  }

  if (typeof row.texto === "string") {
    let texto = row.texto;
    if (/\bAPECC\b/i.test(texto)) {
      texto = texto.replace(/\bAPECC\b/gi, "IPECC");
    }
    if (/unem\s*,\s*cultura/i.test(texto)) {
      texto = texto.replace(/unem\s*,\s*cultura/gi, "unem cultura");
    }
    if (/\bProjetos\s+$/im.test(texto)) {
      texto = texto.replace(/\bProjetos\s+$/gim, "Projetos");
    }
    if (texto !== row.texto) patch.texto = texto;
  }

  return patch;
}

async function main() {
  const apply = process.argv.includes("--apply");

  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { supabaseAdmin } = await import("../lib/supabaseAdmin");

  console.log(
    apply
      ? "Limpeza CMS staging (APLICAR)"
      : "Limpeza CMS staging (dry-run — use --apply para gravar)"
  );
  console.log("Projeto:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  for (const id of CONVENIO_IDS) {
    const { data, error } = await supabaseAdmin
      .from("transparencia_convenios")
      .select("id, titulo, publicado")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("ERRO convenio", id, error.message);
      process.exit(1);
    }
    if (!data) {
      console.log(`  convenio ${id}: não encontrado (ignorar)`);
      continue;
    }

    console.log(
      `  convenio ${id}: titulo=${JSON.stringify(data.titulo)} publicado=${data.publicado}`
    );

    if (apply && data.publicado !== false) {
      const { error: upErr } = await supabaseAdmin
        .from("transparencia_convenios")
        .update({ publicado: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (upErr) {
        console.error("FALHA update convenio", id, upErr.message);
        process.exit(1);
      }
      console.log(`    → publicado=false`);
    }
  }

  for (const id of PAGINA_IDS) {
    const { data, error } = await supabaseAdmin
      .from("paginas_conteudo")
      .select("id, titulo, texto, pagina_slug, bloco")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("ERRO pagina", id, error.message);
      process.exit(1);
    }
    if (!data) {
      console.log(`  pagina ${id}: não encontrada (ignorar)`);
      continue;
    }

    const row = data as PaginaRow;
    const patch = fixPaginaCopy(row);

    console.log(
      `  pagina ${id} (${row.pagina_slug}/${row.bloco}): patch=${JSON.stringify(patch)}`
    );

    if (apply && Object.keys(patch).length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from("paginas_conteudo")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (upErr) {
        console.error("FALHA update pagina", id, upErr.message);
        process.exit(1);
      }
      console.log(`    → atualizado`);
    }
  }

  if (!apply) {
    console.log("\nDry-run concluído. Rode: npm run limpar:cms-staging -- --apply");
    return;
  }

  console.log("\nOK: limpeza aplicada. Rode: npm run auditar:cms-staging");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
