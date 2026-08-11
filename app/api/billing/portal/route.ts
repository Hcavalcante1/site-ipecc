import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getOrgDoUsuario } from "@/lib/auth/getOrgUsuario";
import {
  asaasConfigurado,
  cancelarAssinaturaAsaas,
  listarPagamentosDaAssinatura,
} from "@/lib/billing/asaas";

function supabaseDaRequisicao() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
}

// Asaas não tem um portal hospedado equivalente ao Stripe Billing Portal.
// Em vez disso, abrimos a última fatura gerada (página hospedada pelo
// próprio Asaas, onde o cliente vê status e pode pagar via Pix/boleto/cartão).
export async function POST() {
  if (!asaasConfigurado()) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const supabase = supabaseDaRequisicao();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const org = await getOrgDoUsuario(supabase, user.id);
  if (!org) {
    return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });
  }

  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("asaas_subscription_id")
    .eq("org_id", org.id)
    .maybeSingle();

  if (!assinatura?.asaas_subscription_id) {
    return NextResponse.json({ ok: false, error: "no_subscription" }, { status: 404 });
  }

  try {
    const pagamentos = await listarPagamentosDaAssinatura(assinatura.asaas_subscription_id);
    const ultimaFatura = pagamentos.data?.[0];
    if (!ultimaFatura?.invoiceUrl) {
      return NextResponse.json({ ok: false, error: "sem_fatura" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, url: ultimaFatura.invoiceUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "falha_ao_buscar_fatura" },
      { status: 502 }
    );
  }
}

export async function DELETE() {
  if (!asaasConfigurado()) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const supabase = supabaseDaRequisicao();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const org = await getOrgDoUsuario(supabase, user.id);
  if (!org) {
    return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });
  }

  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("asaas_subscription_id")
    .eq("org_id", org.id)
    .maybeSingle();

  if (!assinatura?.asaas_subscription_id) {
    return NextResponse.json({ ok: false, error: "no_subscription" }, { status: 404 });
  }

  try {
    await cancelarAssinaturaAsaas(assinatura.asaas_subscription_id);
    await supabase
      .from("assinaturas")
      .update({ status: "cancelado", cancelar_no_fim: true, updated_at: new Date().toISOString() })
      .eq("org_id", org.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "falha_ao_cancelar" },
      { status: 502 }
    );
  }
}
