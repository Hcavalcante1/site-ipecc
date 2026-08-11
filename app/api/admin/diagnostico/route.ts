import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { getOrgDoUsuario } from "@/lib/auth/getOrgUsuario";

type CheckStatus = "ok" | "aviso" | "erro";

type Check = {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  status: CheckStatus;
  valor?: string;
};

export const dynamic = "force-dynamic";

async function checarTabelas(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<{
  existentes: Set<string>;
  rlsAtivo: Set<string>;
}> {
  const [tabelasRes, rlsRes] = await Promise.all([
    supabase.rpc("diagnostico_tabelas"),
    supabase.rpc("diagnostico_rls_status"),
  ]);

  const tabelasDados = (tabelasRes.data ?? []) as { table_name: string }[];
  const rlsDados     = (rlsRes.data   ?? []) as { relname: string }[];

  const existentes = new Set(tabelasDados.map((t) => t.table_name));
  const rlsAtivo   = new Set(rlsDados.map((r) => r.relname));

  return { existentes, rlsAtivo };
}

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const checks: Check[] = [];
  const supabase = getSupabaseAdmin();

  // ── Infraestrutura ──────────────────────────────────────────────
  const envChecks: { id: string; key: string; titulo: string; descricao: string; required: boolean }[] = [
    { id: "supabase_url",     key: "NEXT_PUBLIC_SUPABASE_URL",    titulo: "Supabase URL",          descricao: "URL do projeto Supabase.",                  required: true },
    { id: "supabase_anon",    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", titulo: "Supabase Anon Key",   descricao: "Chave pública do Supabase.",                 required: true },
    { id: "service_role",     key: "SUPABASE_SERVICE_ROLE_KEY",   titulo: "Service Role Key",      descricao: "Chave administrativa do Supabase (servidor).", required: true },
    { id: "site_url",         key: "NEXT_PUBLIC_SITE_URL",        titulo: "URL do site",           descricao: "Base URL pública usada em links e e-mails.", required: false },
    { id: "asaas_key",        key: "ASAAS_API_KEY",               titulo: "Asaas API Key",         descricao: "Habilita billing e checkout via Pix/boleto/cartão.", required: false },
    { id: "asaas_webhook",    key: "ASAAS_WEBHOOK_TOKEN",         titulo: "Asaas Webhook Token",   descricao: "Valida eventos recebidos do Asaas.",         required: false },
  ];

  for (const c of envChecks) {
    const presente = !!process.env[c.key]?.trim();
    checks.push({
      id: c.id,
      categoria: "Infraestrutura",
      titulo: c.titulo,
      descricao: c.descricao,
      status: presente ? "ok" : c.required ? "erro" : "aviso",
      valor: presente ? "configurado" : "não definido",
    });
  }

  // ── Banco de dados ───────────────────────────────────────────────
  let existentes = new Set<string>();
  let rlsAtivo   = new Set<string>();

  try {
    const r = await checarTabelas(supabase);
    existentes = r.existentes;
    rlsAtivo   = r.rlsAtivo;
  } catch {
    checks.push({
      id: "db_conn",
      categoria: "Banco de dados",
      titulo: "Conexão com Supabase",
      descricao: "Não foi possível consultar o banco de dados.",
      status: "erro",
    });
  }

  const tabelasObrigatorias: { nome: string; titulo: string }[] = [
    { nome: "organizacoes",             titulo: "Tabela: organizacoes" },
    { nome: "editais",                  titulo: "Tabela: editais" },
    { nome: "propostas",                titulo: "Tabela: propostas" },
    { nome: "beneficiarios",            titulo: "Tabela: beneficiarios" },
    { nome: "org_membros",              titulo: "Tabela: org_membros" },
    { nome: "convites_org",             titulo: "Tabela: convites_org" },
    { nome: "assinaturas",              titulo: "Tabela: assinaturas" },
    { nome: "portal_tokens",            titulo: "Tabela: portal_tokens" },
    { nome: "api_tokens",               titulo: "Tabela: api_tokens" },
    { nome: "lgpd_consentimentos",      titulo: "Tabela: lgpd_consentimentos" },
    { nome: "lgpd_solicitacoes",        titulo: "Tabela: lgpd_solicitacoes" },
    { nome: "transparencia_convenios",  titulo: "Tabela: transparencia_convenios" },
  ];

  for (const t of tabelasObrigatorias) {
    const existe = existentes.has(t.nome);
    checks.push({
      id: `tabela_${t.nome}`,
      categoria: "Banco de dados",
      titulo: t.titulo,
      descricao: `Migration ${existe ? "aplicada" : "pendente"}.`,
      status: existe ? "ok" : "erro",
      valor: existe ? "existe" : "ausente",
    });
  }

  // ── Segurança / RLS ─────────────────────────────────────────────
  const tabelasRls = ["propostas", "beneficiarios", "org_membros", "assinaturas", "convites_org", "api_tokens", "portal_tokens"];
  for (const t of tabelasRls) {
    if (!existentes.has(t)) continue;
    const ativo = rlsAtivo.has(t);
    checks.push({
      id: `rls_${t}`,
      categoria: "Segurança",
      titulo: `RLS: ${t}`,
      descricao: `Row Level Security na tabela ${t}.`,
      status: ativo ? "ok" : "erro",
      valor: ativo ? "ativo" : "desativado",
    });
  }

  // ── Organização ──────────────────────────────────────────────────
  if (existentes.has("organizacoes")) {
    // Organizacao do usuario logado, nao a mais antiga do banco (bug real
    // corrigido em 2026-08-11).
    const org = await getOrgDoUsuario(supabase, auth.userId);

    checks.push({
      id: "org_existe",
      categoria: "Organização",
      titulo: "Organização configurada",
      descricao: "Deve existir ao menos uma organização no sistema.",
      status: org ? "ok" : "erro",
      valor: org?.nome ?? "não encontrada",
    });

    if (org) {
      checks.push({
        id: "org_slug",
        categoria: "Organização",
        titulo: "Slug configurado",
        descricao: `Slug único para URL do portal público /org/${org.slug ?? "?"}.`,
        status: org.slug ? "ok" : "aviso",
        valor: org.slug ?? "não definido",
      });
      checks.push({
        id: "org_logo",
        categoria: "Organização",
        titulo: "Logo da organização",
        descricao: "URL de logo para o portal público e white-label.",
        status: org.logo_url ? "ok" : "aviso",
        valor: org.logo_url ? "configurado" : "não definido",
      });
      checks.push({
        id: "org_plano",
        categoria: "Organização",
        titulo: "Plano contratado",
        descricao: "Plano ativo da organização.",
        status: org.plano && org.plano !== "gratuito" ? "ok" : "aviso",
        valor: org.plano ?? "gratuito",
      });
    }
  }

  // ── Usuários ─────────────────────────────────────────────────────
  if (existentes.has("admin_perfis")) {
    const { count: mestres } = await supabase
      .from("admin_perfis")
      .select("user_id", { count: "exact", head: true })
      .eq("papel", "mestre")
      .eq("ativo", true);

    checks.push({
      id: "admin_mestre",
      categoria: "Usuários",
      titulo: "Usuário mestre",
      descricao: "Ao menos um mestre deve estar ativo.",
      status: (mestres ?? 0) > 0 ? "ok" : "erro",
      valor: `${mestres ?? 0} mestre(s) ativo(s)`,
    });
  }

  if (existentes.has("convites_org")) {
    const { count: convitesPendentes } = await supabase
      .from("convites_org")
      .select("id", { count: "exact", head: true })
      .is("aceito_em", null)
      .gt("expires_at", new Date().toISOString());

    checks.push({
      id: "convites_pendentes",
      categoria: "Usuários",
      titulo: "Convites pendentes",
      descricao: "Convites enviados ainda não aceitos.",
      status: "ok",
      valor: `${convitesPendentes ?? 0} pendente(s)`,
    });
  }

  // ── Integrações ──────────────────────────────────────────────────
  if (existentes.has("portal_tokens")) {
    const { count: portalCount } = await supabase
      .from("portal_tokens")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true);

    checks.push({
      id: "portal_tokens_ativos",
      categoria: "Integrações",
      titulo: "Portal tokens ativos",
      descricao: "Tokens do Portal do Financiador em uso.",
      status: "ok",
      valor: `${portalCount ?? 0} ativo(s)`,
    });
  }

  if (existentes.has("api_tokens")) {
    const { count: apiCount } = await supabase
      .from("api_tokens")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true);

    checks.push({
      id: "api_tokens_ativos",
      categoria: "Integrações",
      titulo: "API tokens ativos",
      descricao: "Tokens da API pública v1 em uso.",
      status: "ok",
      valor: `${apiCount ?? 0} ativo(s)`,
    });
  }

  const totalChecks  = checks.length;
  const erros        = checks.filter((c) => c.status === "erro").length;
  const avisos       = checks.filter((c) => c.status === "aviso").length;
  const oks          = checks.filter((c) => c.status === "ok").length;
  const pontuacao    = Math.round((oks / totalChecks) * 100);

  return NextResponse.json({ ok: true, checks, resumo: { total: totalChecks, oks, avisos, erros, pontuacao } });
}
