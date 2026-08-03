import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envSet(key: string): boolean {
  return Boolean(String(process.env[key] ?? "").trim());
}

export type StatusIntegracao = "ok" | "parcial" | "nao_configurado";

export type Integracao = {
  id:      string;
  nome:    string;
  icone:   string;
  status:  StatusIntegracao;
  campos:  { chave: string; label: string; presente: boolean }[];
  doc_url: string | null;
  descricao: string;
};

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Verificar assinatura ativa
  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("plano, status, stripe_customer_id")
    .maybeSingle();

  const ass = assinatura as { plano?: string; status?: string; stripe_customer_id?: string } | null;

  const integracoes: Integracao[] = [
    // ── Supabase ─────────────────────────────────────────────────────
    (() => {
      const campos = [
        { chave: "NEXT_PUBLIC_SUPABASE_URL",      label: "URL do projeto",     presente: envSet("NEXT_PUBLIC_SUPABASE_URL") },
        { chave: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Chave anônima",      presente: envSet("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
        { chave: "SUPABASE_SERVICE_ROLE_KEY",     label: "Chave service role", presente: envSet("SUPABASE_SERVICE_ROLE_KEY") },
      ];
      const todos = campos.every((c) => c.presente);
      return {
        id: "supabase", nome: "Supabase", icone: "🗄️",
        status: todos ? "ok" : "parcial" as StatusIntegracao,
        campos,
        doc_url: null,
        descricao: "Banco de dados, autenticação e armazenamento de arquivos. Núcleo da plataforma.",
      };
    })(),

    // ── Stripe ────────────────────────────────────────────────────────
    (() => {
      const campos = [
        { chave: "STRIPE_SECRET_KEY",         label: "Chave secreta",       presente: envSet("STRIPE_SECRET_KEY") },
        { chave: "STRIPE_WEBHOOK_SECRET",      label: "Webhook secret",      presente: envSet("STRIPE_WEBHOOK_SECRET") },
        { chave: "STRIPE_PRICE_STARTER",       label: "Price ID Starter",    presente: envSet("STRIPE_PRICE_STARTER") },
        { chave: "STRIPE_PRICE_PROFISSIONAL",  label: "Price ID Profissional",presente: envSet("STRIPE_PRICE_PROFISSIONAL") },
        { chave: "STRIPE_PRICE_ENTERPRISE",    label: "Price ID Enterprise", presente: envSet("STRIPE_PRICE_ENTERPRISE") },
        { chave: "NEXT_PUBLIC_SITE_URL",       label: "URL do site",         presente: envSet("NEXT_PUBLIC_SITE_URL") },
      ];
      const presentes = campos.filter((c) => c.presente).length;
      const status: StatusIntegracao = presentes === campos.length ? "ok" : presentes === 0 ? "nao_configurado" : "parcial";
      return {
        id: "stripe", nome: "Stripe (Faturamento)", icone: "💳",
        status,
        campos,
        doc_url: "https://dashboard.stripe.com",
        descricao: `Pagamentos e assinaturas. ${ass ? `Plano atual: ${ass.plano ?? "—"} (${ass.status ?? "—"})` : "Sem assinatura registrada."}`,
      };
    })(),

    // ── Resend (E-mail) ───────────────────────────────────────────────
    (() => {
      const campos = [
        { chave: "RESEND_API_KEY", label: "API Key",        presente: envSet("RESEND_API_KEY") },
        { chave: "RESEND_FROM",    label: "Endereço FROM",  presente: envSet("RESEND_FROM") },
      ];
      const todos = campos.every((c) => c.presente);
      const nenhum = campos.every((c) => !c.presente);
      return {
        id: "resend", nome: "Resend (E-mail)", icone: "📧",
        status: todos ? "ok" : nenhum ? "nao_configurado" : "parcial" as StatusIntegracao,
        campos,
        doc_url: "https://resend.com",
        descricao: "Envio de e-mails transacionais: convites, resposta LGPD, OTP de assinatura.",
      };
    })(),

    // ── WhatsApp ──────────────────────────────────────────────────────
    (() => {
      const campos = [
        { chave: "WHATSAPP_API_URL",   label: "API URL",   presente: envSet("WHATSAPP_API_URL") },
        { chave: "WHATSAPP_API_TOKEN", label: "API Token", presente: envSet("WHATSAPP_API_TOKEN") },
      ];
      const todos   = campos.every((c) => c.presente);
      const nenhum  = campos.every((c) => !c.presente);
      return {
        id: "whatsapp", nome: "WhatsApp API", icone: "💬",
        status: todos ? "ok" : nenhum ? "nao_configurado" : "parcial" as StatusIntegracao,
        campos,
        doc_url: null,
        descricao: "Recebimento e envio de mensagens via WhatsApp Business API.",
      };
    })(),

    // ── Site URL ─────────────────────────────────────────────────────
    (() => {
      const campos = [
        { chave: "NEXT_PUBLIC_SITE_URL", label: "URL pública do site", presente: envSet("NEXT_PUBLIC_SITE_URL") },
      ];
      return {
        id: "site_url", nome: "URL do Site", icone: "🌐",
        status: campos[0].presente ? "ok" : "nao_configurado" as StatusIntegracao,
        campos,
        doc_url: null,
        descricao: "URL base usada em links de e-mail, convites e webhooks. Ex: https://ipecc.org.br",
      };
    })(),
  ];

  const totalOk = integracoes.filter((i) => i.status === "ok").length;
  const totalParcial = integracoes.filter((i) => i.status === "parcial").length;

  return NextResponse.json({
    integracoes,
    resumo: {
      total: integracoes.length,
      ok: totalOk,
      parcial: totalParcial,
      nao_configurado: integracoes.length - totalOk - totalParcial,
    },
    assinatura: ass,
  });
}
