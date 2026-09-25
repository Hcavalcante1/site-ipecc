/**
 * Aplica a tabela de dirigentes e cadastra os cargos da Ata de Posse IPECC.
 *
 * Uso:
 *   node scripts/aplicar-dirigentes-assinatura.cjs
 *
 * Requer DATABASE_URL/DIRECT_URL ou SUPABASE_DB_PASSWORD em .env.local.
 *
 * Para vincular login por cargo, defina opcionalmente em .env.local:
 *   DIRIGENTE_EMAIL_PRESIDENTE=
 *   DIRIGENTE_EMAIL_DIRETOR_FINANCEIRO=
 *   DIRIGENTE_EMAIL_DIRETORA_ADMINISTRATIVA=
 *   DIRIGENTE_EMAIL_DIRETOR_PROJETOS=
 *   DIRIGENTE_EMAIL_PRESIDENTE_CONSELHO_FISCAL=
 *   DIRIGENTE_EMAIL_CONSELHO_FISCAL_1=
 *   DIRIGENTE_EMAIL_CONSELHO_FISCAL_2=
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ATA_URL =
  "https://eohshxaxbsdpxundsley.supabase.co/storage/v1/object/public/docs/transparencia/1771541332172-Ata%20e%20Posse%20-IPECC.pdf";

const DIRIGENTES = [
  {
    nome: "Andreza Moralles Balbino",
    cargo: "Presidente",
    role_code: "presidente",
    cpf_last4: "2888",
    emailEnv: "DIRIGENTE_EMAIL_PRESIDENTE",
  },
  {
    nome: "Jhonatan de Oliveira",
    cargo: "Diretor Financeiro",
    role_code: "diretor_financeiro",
    cpf_last4: "4878",
    emailEnv: "DIRIGENTE_EMAIL_DIRETOR_FINANCEIRO",
  },
  {
    nome: "Dina Fernandes de Oliveira",
    cargo: "Diretora Administrativa",
    role_code: "diretora_administrativa",
    cpf_last4: "3861",
    emailEnv: "DIRIGENTE_EMAIL_DIRETORA_ADMINISTRATIVA",
  },
  {
    nome: "Sandro Vasconcelos Pedro",
    cargo: "Diretor de Projetos",
    role_code: "diretor_projetos",
    cpf_last4: "9861",
    emailEnv: "DIRIGENTE_EMAIL_DIRETOR_PROJETOS",
  },
  {
    nome: "Marcos Aurélio da Silva Moreira Masuda",
    cargo: "Presidente do Conselho Fiscal",
    role_code: "presidente_conselho_fiscal",
    cpf_last4: "7886",
    emailEnv: "DIRIGENTE_EMAIL_PRESIDENTE_CONSELHO_FISCAL",
  },
  {
    nome: "Vagner Sidnei Anselmo de Oliveira",
    cargo: "Membro Efetivo do Conselho Fiscal",
    role_code: "conselho_fiscal_1",
    cpf_last4: "2865",
    emailEnv: "DIRIGENTE_EMAIL_CONSELHO_FISCAL_1",
  },
  {
    nome: "Laysla Vitória Aparecida Januário",
    cargo: "Membro Efetivo do Conselho Fiscal",
    role_code: "conselho_fiscal_2",
    cpf_last4: "3807",
    emailEnv: "DIRIGENTE_EMAIL_CONSELHO_FISCAL_2",
  },
];

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    }
  }
}

function buildCandidates(ref, password) {
  const enc = encodeURIComponent(password);
  const regions = ["sa-east-1", "us-east-1", "us-east-2", "us-west-2"];
  const out = [];
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      out.push(
        `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:${port}/postgres`
      );
    }
  }
  out.push(`postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`);
  return out;
}

async function connectPg() {
  let Client;
  try {
    ({ Client } = require("pg"));
  } catch {
    throw new Error(
      "Pacote 'pg' nao esta instalado. Aplique docs/sql/gestao-documental-dirigentes-assinatura.sql no SQL Editor do Supabase ou instale 'pg' antes de rodar este script."
    );
  }

  let candidates = [];
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    candidates = [process.env.DATABASE_URL || process.env.DIRECT_URL];
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const password =
      process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    if (!ref || !password) {
      throw new Error(
        "Falta DATABASE_URL/DIRECT_URL ou SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL)."
      );
    }
    candidates = buildCandidates(ref, password);
  }

  let lastErr = null;
  for (const cs of candidates) {
    const label = String(cs).replace(/:[^:@/]+@/, ":****@");
    const client = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    try {
      console.log("Tentando", label);
      await client.connect();
      console.log("Conectado.");
      return client;
    } catch (err) {
      lastErr = err;
      console.error("FAIL:", label, err.message || err);
      try {
        await client.end();
      } catch {
        /* noop */
      }
    }
  }
  throw lastErr || new Error("Nenhuma conexao funcionou.");
}

async function findAuthUserByEmail(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.warn("Nao consegui listar usuarios Auth:", error.message);
    return null;
  }
  return (
    data.users.find(
      (user) => String(user.email || "").toLowerCase() === email.toLowerCase()
    ) || null
  );
}

async function main() {
  loadEnvLocal();
  const client = await connectPg();
  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "docs/sql/gestao-documental-dirigentes-assinatura.sql"),
      "utf8"
    );
    console.log("Aplicando tabela org_dirigentes...");
    await client.query(sql);

    for (const dirigente of DIRIGENTES) {
      const email = String(process.env[dirigente.emailEnv] || "")
        .trim()
        .toLowerCase();
      const authUser = email ? await findAuthUserByEmail(email) : null;
      const params = [
        IPECC_ORG_ID,
        authUser?.id || null,
        email || null,
        dirigente.nome,
        dirigente.cpf_last4,
        dirigente.cargo,
        dirigente.role_code,
        `Fonte: Ata de Eleicao e Posse publicada em Transparencia (${ATA_URL})`,
      ];
      const updated = await client.query(
        `
        update public.org_dirigentes
        set
          user_id = $2,
          email = $3,
          nome = $4,
          cpf_last4 = $5,
          cargo = $6,
          observacao = $8,
          updated_at = now()
        where org_id = $1
          and processo_id is null
          and role_code = $7
        `,
        params
      );
      if (updated.rowCount === 0) {
        await client.query(
          `
          insert into public.org_dirigentes (
            org_id, user_id, email, nome, cpf_last4, cargo, role_code,
            ativo, origem, observacao, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, true, 'ata_posse', $8, now())
          `,
          params
        );
      }
      console.log(
        `${dirigente.role_code}: ${dirigente.nome} <${email || "sem email"}>${
          authUser ? ` user=${authUser.id}` : ""
        }`
      );
    }

    const rows = await client.query(
      "select nome, cargo, role_code, email, user_id, ativo from public.org_dirigentes where org_id = $1 order by created_at",
      [IPECC_ORG_ID]
    );
    console.log("\nDirigentes cadastrados:");
    console.table(rows.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Falha:", err.message || err);
  process.exit(1);
});
