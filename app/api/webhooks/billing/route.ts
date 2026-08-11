import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AsaasWebhookPayload = {
  event: string;
  payment?: {
    id: string;
    subscription?: string;
    billingType?: string;
    status?: string;
  };
};

export async function POST(req: NextRequest) {
  if (!process.env.ASAAS_API_KEY) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  // Asaas autentica o webhook por um token fixo configurado no painel deles,
  // enviado no header abaixo -- não é uma assinatura HMAC como a Stripe usa.
  const token = req.headers.get("asaas-access-token") ?? "";
  const tokenEsperado = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();
  if (tokenEsperado && token !== tokenEsperado) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as AsaasWebhookPayload | null;
  if (!body?.event) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const subscriptionId = body.payment?.subscription;
  if (!subscriptionId) {
    // Eventos de cobrança avulsa (fora de assinatura) não interessam aqui.
    return NextResponse.json({ ok: true });
  }

  switch (body.event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      const { data: assinatura } = await supabaseAdmin
        .from("assinaturas")
        .select("org_id, plano, forma_pagamento")
        .eq("asaas_subscription_id", subscriptionId)
        .maybeSingle();

      if (!assinatura) break;

      const hoje = new Date();
      const proximoMes = new Date(hoje);
      proximoMes.setMonth(proximoMes.getMonth() + 1);

      await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "ativo",
          forma_pagamento: body.payment?.billingType ?? assinatura.forma_pagamento,
          periodo_inicio: hoje.toISOString(),
          periodo_fim: proximoMes.toISOString(),
          updated_at: hoje.toISOString(),
        })
        .eq("asaas_subscription_id", subscriptionId);

      await supabaseAdmin
        .from("organizacoes")
        .update({ plano: assinatura.plano })
        .eq("id", assinatura.org_id);
      break;
    }

    case "PAYMENT_OVERDUE": {
      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "inadimplente", updated_at: new Date().toISOString() })
        .eq("asaas_subscription_id", subscriptionId);
      break;
    }

    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED": {
      const { data: assinatura } = await supabaseAdmin
        .from("assinaturas")
        .select("org_id")
        .eq("asaas_subscription_id", subscriptionId)
        .maybeSingle();

      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("asaas_subscription_id", subscriptionId);

      if (assinatura?.org_id) {
        await supabaseAdmin
          .from("organizacoes")
          .update({ plano: "gratuito" })
          .eq("id", assinatura.org_id);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
