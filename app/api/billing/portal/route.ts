import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
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
    .select("id")
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

  if (!assinatura?.stripe_customer_id) {
    return NextResponse.json({ ok: false, error: "no_subscription" }, { status: 404 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-07-29.dahlia" });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

  const session = await stripe.billingPortal.sessions.create({
    customer: assinatura.stripe_customer_id,
    return_url: `${baseUrl}/admin/faturamento`,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
