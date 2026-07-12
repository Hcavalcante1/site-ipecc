/**
 * Valida labels de Acessos + integridade de operadores no banco.
 * Uso: npm run validar:admin-acessos
 *
 * Nao faz login HTTP (sem senha). Confere:
 * - helpers de tipo/processo/chips
 * - mensagens de login
 * - operadores ativos tem (ou avisam) escopo
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";
import {
  chipsModulosEscopo,
  labelProcessoCompleto,
  labelTipoProcesso,
} from "../lib/auth/processoLabels";
import { mensagemErroLoginAdmin } from "../lib/auth/loginAdminMessages";
import { modulosPermitidos, type AdminContexto } from "../lib/auth/adminEscopo";

loadEnvLocal();

let ok = 0;
let fail = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    ok++;
    console.log("OK:", name);
  } else {
    fail++;
    console.error("FALHA:", name);
  }
}

async function main() {
  assert(
    "label tipo interno",
    labelTipoProcesso("interno_ipecc") === "Interno IPECC"
  );
  assert(
    "label processo completo",
    labelProcessoCompleto({
      titulo: "Proc A",
      tipo: "publico_externo",
      status: "ativo",
    }).includes("pública")
  );
  assert(
    "chips modulos",
    chipsModulosEscopo({
      mod_editais: true,
      mod_propostas: false,
      mod_transparencia: true,
    }).join(",") === "Editais,Transparência"
  );

  assert(
    "msg senha invalida",
    mensagemErroLoginAdmin({
      authErrorMessage: "Invalid login credentials",
    }).includes("senha")
  );
  assert(
    "msg falta perfil 403",
    mensagemErroLoginAdmin({
      status: 403,
      apiError: "Falta perfil ativo em Acessos",
    }).includes("perfil")
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("AVISO: sem service role — pulando checagem de banco.");
    console.log(`\nOK: ${ok} | Falhas: ${fail}`);
    process.exit(fail > 0 ? 1 : 0);
  }

  const admin = createClient(url, key);
  const { data: perfis, error: e1 } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo");
  let { data: escopos, error: e2 } = await admin
    .from("admin_escopos")
    .select(
      "user_id, processo_id, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital"
    );
  if (
    e2 &&
    /mod_digital|column .* does not exist/i.test(e2.message || "")
  ) {
    const fallback = await admin
      .from("admin_escopos")
      .select(
        "user_id, processo_id, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
      );
    escopos = fallback.data as typeof escopos;
    e2 = fallback.error;
    if (!e2) {
      console.log(
        "AVISO: coluna mod_digital ausente — aplique docs/sql/admin-escopos-mod-digital.sql"
      );
    }
  }
  const { data: processos, error: e3 } = await admin
    .from("processos_contratacao")
    .select("id, titulo, tipo, status");

  assert("carregou admin_perfis", !e1);
  assert("carregou admin_escopos", !e2);
  assert("carregou processos", !e3);
  assert(
    "processos com campo tipo",
    (processos || []).every((p) => "tipo" in p)
  );

  const operadores = (perfis || []).filter(
    (p) => p.ativo && p.papel !== "mestre"
  );
  for (const op of operadores) {
    const mine = (escopos || []).filter((e) => e.user_id === op.user_id);
    const ctx: AdminContexto = {
      userId: op.user_id,
      email: op.email,
      papel: op.papel,
      ativo: true,
      escopos: mine.map((e) => ({
        id: "x",
        processo_id: e.processo_id,
        modalidade: null,
        mod_editais: e.mod_editais,
        mod_propostas: e.mod_propostas,
        mod_transparencia: e.mod_transparencia,
        mod_noticias: e.mod_noticias,
        mod_eventos: e.mod_eventos,
        mod_projetos: e.mod_projetos,
        mod_digital: Boolean(
          (e as { mod_digital?: boolean }).mod_digital
        ),
      })),
      legadoIsAdmin: false,
    };
    const mods = modulosPermitidos(ctx);
    console.log(
      `operador ${op.email}: escopos=${mine.length} modulos=[${mods.join(",")}]`
    );
    if (mine.length === 0) {
      console.log(
        `AVISO: ${op.email} sem escopo — entra no admin sem menus de modulo.`
      );
    } else {
      assert(`operador ${op.email} tem ao menos 1 modulo`, mods.length > 0);
    }
  }

  console.log(`\nOK: ${ok} | Falhas: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
