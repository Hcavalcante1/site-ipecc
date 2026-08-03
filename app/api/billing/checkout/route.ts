import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const PRICE_MAP: Record<string, string | undefined> = {
  starter:      process.env.STRIPE_PRICE_STARTER,
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  enterprise:   process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { plano } = (await req.json()) as { plano?: string };
  const priceId = plano ? PRICE_MAP[plano] : undefined;
  if (!priceId) {
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

  const { data: org } = await supabase
    .from("organizacoes")
    .select("id, nome")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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
    success_url: `${baseUrl}/admin/faturamento?checkout=success`,
    cancel_url:  `${baseUrl}/admin/faturamento?checkout=cancelled`,
    metadata: { org_id: org.id, plano },
    subscription_data: { metadata: { org_id: org.id, plano } },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
