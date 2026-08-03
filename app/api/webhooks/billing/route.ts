import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLANO_POR_PRICE: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER      ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PROFISSIONAL ?? ""]: "profissional",
  [process.env.STRIPE_PRICE_ENTERPRISE   ?? ""]: "enterprise",
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-07-29.dahlia" });

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        customer: string;
        subscription: string;
        metadata: Record<string, string>;
      };
      const orgId = session.metadata?.org_id;
      const plano = session.metadata?.plano ?? "starter";
      if (!orgId) break;

      await supabaseAdmin.from("assinaturas").upsert({
        org_id:                  orgId,
        stripe_customer_id:      session.customer,
        stripe_subscription_id:  session.subscription,
        plano,
        status: "ativo",
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });

      await supabaseAdmin.from("organizacoes").update({ plano }).eq("id", orgId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as {
        id: string;
        status: string;
        items: { data: { price: { id: string } }[] };
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
        metadata: Record<string, string>;
      };
      const priceId = sub.items.data[0]?.price?.id ?? "";
      const plano   = PLANO_POR_PRICE[priceId] ?? "starter";
      const orgId   = sub.metadata?.org_id;

      const updates = {
        plano,
        status:          mapStatus(sub.status),
        periodo_inicio:  new Date(sub.current_period_start * 1000).toISOString(),
        periodo_fim:     new Date(sub.current_period_end   * 1000).toISOString(),
        cancelar_no_fim: sub.cancel_at_period_end,
        updated_at:      new Date().toISOString(),
      };

      await supabaseAdmin
        .from("assinaturas")
        .update(updates)
        .eq("stripe_subscription_id", sub.id);

      if (orgId) {
        await supabaseAdmin.from("organizacoes").update({ plano }).eq("id", orgId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as { id: string; metadata: Record<string, string> };
      const orgId = sub.metadata?.org_id;

      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);

      if (orgId) {
        await supabaseAdmin.from("organizacoes").update({ plano: "gratuito" }).eq("id", orgId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as { subscription: string };
      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "inadimplente", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", invoice.subscription);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as unknown as { subscription: string };
      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "ativo", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", invoice.subscription);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}

function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":   return "ativo";
    case "trialing": return "trial";
    case "past_due": return "inadimplente";
    case "canceled": return "cancelado";
    default:         return stripeStatus;
  }
}
