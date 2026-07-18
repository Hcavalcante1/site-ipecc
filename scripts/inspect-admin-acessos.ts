/**
 * Mostra perfis + escopos de um e-mail (ou todos se omitir).
 * Uso: npx tsx scripts/inspect-admin-acessos.ts [email]
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";

loadEnvLocal();

const emailFilter = (process.argv[2] || "").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key);

async function main() {
  const { data: perfis, error: e1 } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .order("email");
  if (e1) throw e1;

  const { data: escopos, error: e2 } = await admin
    .from("admin_escopos")
    .select(
      "id, user_id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
    );
  if (e2) throw e2;

  const { data: processos, error: e3 } = await admin
    .from("processos_contratacao")
    .select("id, titulo, status");
  if (e3) throw e3;

  const procMap = new Map((processos || []).map((p) => [p.id, p.titulo]));

  let list = perfis || [];
  if (emailFilter) {
    list = list.filter((p) => (p.email || "").toLowerCase() === emailFilter);
    if (list.length === 0) {
      const { data: listed } = await admin.auth.admin.listUsers({
        perPage: 1000,
      });
      const u = (listed?.users || []).find(
        (x) => (x.email || "").toLowerCase() === emailFilter
      );
      console.log("perfil por email: nenhum");
      console.log("auth:", u ? { id: u.id, email: u.email } : null);
      if (u) {
        const linked = (escopos || []).filter((e) => e.user_id === u.id);
        console.log("escopos pelo user_id do Auth:", linked);
      }
      return;
    }
  }

  console.log("processos:", processos || []);
  for (const p of list) {
    const mine = (escopos || []).filter((e) => e.user_id === p.user_id);
    console.log("\n===", p.email, "|", p.papel, "| ativo:", p.ativo);
    console.log("user_id:", p.user_id);
    if (mine.length === 0) {
      console.log("escopos: (nenhum)");
    } else {
      for (const e of mine) {
        console.log({
          escopo_id: e.id,
          processo: procMap.get(e.processo_id || "") || e.processo_id,
          mods: {
            editais: e.mod_editais,
            propostas: e.mod_propostas,
            transparencia: e.mod_transparencia,
            noticias: e.mod_noticias,
            eventos: e.mod_eventos,
            projetos: e.mod_projetos,
          },
        });
      }
    }
  }

  console.log("\nTotal escopos no banco:", (escopos || []).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
