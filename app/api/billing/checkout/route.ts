import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  asaasConfigurado,
  criarClienteAsaas,
  criarAssinaturaAsaas,
  cancelarAssinaturaAsaas,
  listarPagamentosDaAssinatura,
} from "@/lib/billing/asaas";

const VALOR_PLANOS: Record<string, number> = {
  starter: 190,
  profissional: 490,
};

// Mesmo fallback usado em lib/auth/useOrgContexto.ts quando o usuário não tem
// linha em org_membros.
const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export async function POST(req: NextRequest) {
  if (!asaasConfigurado()) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { plano } = (await req.json()) as { plano?: string; retorno?: string };
  const valor = plano ? VALOR_PLANOS[plano] : undefined;
  if (!valor) {
    return NextResponse.json({ ok: false, error: "plano_invalido" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Organizacao do usuario logado (nao a mais antiga do banco -- bug corrigido
  // em 2026-08-11, ver docs/INCIDENTE-RLS-REPOS-DIVERGENTES-2026-08-11.md).
  const { data: membro } = await supabase
    .from("org_membros")
    .select("org_id, organizacoes(id, nome, cnpj_cpf)")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  type OrgRow = { id: string; nome: string; cnpj_cpf: string | null };
  let org: OrgRow | null = membro?.organizacoes
    ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as OrgRow)
    : null;

  if (!org) {
    const { data: orgPadrao } = await supabase
      .from("organizacoes")
      .select("id, nome, cnpj_cpf")
      .eq("id", IPECC_ORG_ID)
      .maybeSingle();
    org = orgPadrao;
  }

  if (!org) {
    return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });
  }

  if (!org.cnpj_cpf) {
    return NextResponse.json({ ok: false, error: "cnpj_cpf_obrigatorio" }, { status: 422 });
  }

  const { data: assinaturaAtual } = await supabase
    .from("assinaturas")
    .select("asaas_customer_id, asaas_subscription_id, plano, status")
    .eq("org_id", org.id)
    .maybeSingle();

  try {
    // Já existe assinatura pendente pro mesmo plano (usuário clicou de novo
    // sem ter pago ainda) -- reaproveita em vez de criar duplicata no Asaas.
    if (
      assinaturaAtual?.status === "pendente" &&
      assinaturaAtual.plano === plano &&
      assinaturaAtual.asaas_subscription_id
    ) {
      const pagamentosExistentes = await listarPagamentosDaAssinatura(
        assinaturaAtual.asaas_subscription_id
      );
      const faturaExistente = pagamentosExistentes.data?.[0];
      if (faturaExistente?.invoiceUrl) {
        return NextResponse.json({ ok: true, url: faturaExistente.invoiceUrl });
      }
    }

    let customerId = assinaturaAtual?.asaas_customer_id ?? null;
    if (!customerId) {
      const customer = await criarClienteAsaas({
        name: org.nome,
        email: user.email!,
        cpfCnpj: org.cnpj_cpf,
        externalReference: org.id,
      });
      customerId = customer.id;
    }

    // Pendente de outro plano (trocou de ideia antes de pagar) -- cancela pra
    // não deixar duas assinaturas concorrentes abertas no Asaas.
    if (assinaturaAtual?.status === "pendente" && assinaturaAtual.asaas_subscription_id) {
      await cancelarAssinaturaAsaas(assinaturaAtual.asaas_subscription_id).catch(() => {});
    }

    const hoje = new Date().toISOString().slice(0, 10);

    const subscription = await criarAssinaturaAsaas({
      customer: customerId,
      value: valor,
      description: `Plataforma IPECC — Plano ${plano}`,
      externalReference: org.id,
      nextDueDate: hoje,
    });

    await supabase.from("assinaturas").upsert(
      {
        org_id: org.id,
        asaas_customer_id: customerId,
        asaas_subscription_id: subscription.id,
        plano,
        status: "pendente",
        forma_pagamento: "UNDEFINED",
        cancelar_no_fim: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

    const pagamentos = await listarPagamentosDaAssinatura(subscription.id);
    const primeiraFatura = pagamentos.data?.[0];

    if (!primeiraFatura?.invoiceUrl) {
      return NextResponse.json({ ok: false, error: "fatura_nao_gerada" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: primeiraFatura.invoiceUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "falha_ao_criar_assinatura" },
      { status: 502 }
    );
  }
}
