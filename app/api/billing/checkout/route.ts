import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const PRICE_MAP: Record<string, string | undefined> = {
  starter:      process.env.STRIPE_PRICE_STARTER,
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  enterprise:   process.env.STRIPE_PRICE_ENTERPRISE,
};

// Mesmo fallback usado em lib/auth/useOrgContexto.ts quando o usuário não tem
// linha em org_membros.
const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { plano, retorno } = (await req.json()) as { plano?: string; retorno?: string };
  const priceId = plano ? PRICE_MAP[plano] : undefined;
  if (!priceId) {
    return NextResponse.json({ ok: false, error: "plano_invalido" }, { status: 400 });
  }

  // Volta pra onde o checkout foi iniciado (/conta/faturamento pro cliente
  // self-service, /admin/faturamento pra equipe IPECC). So aceita paths
  // internos conhecidos -- nunca redireciona pra fora do proprio site.
  const returnPath = retorno === "/conta/faturamento" ? retorno : "/admin/faturamento";

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
  // Mesmo padrao de lib/auth/useOrgContexto.ts: busca via org_membros, com
  // fallback pra org padrao do IPECC se o usuario nao tiver membership.
  const { data: membro } = await supabase
    .from("org_membros")
    .select("org_id, organizacoes(id, nome)")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  type OrgRow = { id: string; nome: string };
  let org: OrgRow | null = membro?.organizacoes
    ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as OrgRow)
    : null;

  if (!org) {
    const { data: orgPadrao } = await supabase
      .from("organizacoes")
      .select("id, nome")
      .eq("id", IPECC_ORG_ID)
      .maybeSingle();
    org = orgPadrao;
  }

  if (!org) {
    return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });
  }

  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("stripe_customer_id")
    .eq("org_id", org.id)
    .maybeSingle();

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-07-29.dahlia" });

  let customerId = assinatura?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.nome,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${returnPath}?checkout=success`,
    cancel_url:  `${baseUrl}${returnPath}?checkout=cancelled`,
    metadata: { org_id: org.id, plano },
    subscription_data: { metadata: { org_id: org.id, plano } },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
