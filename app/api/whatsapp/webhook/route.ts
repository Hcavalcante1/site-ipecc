import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Esqueleto WhatsApp Cloud API — sem credenciais reais até configurar env.
 * Docs: docs/WHATSAPP-BOT-PLANO.md
 */

export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!process.env.WHATSAPP_APP_SECRET) {
    return NextResponse.json(
      { ok: false, reason: "whatsapp_not_configured" },
      { status: 503 }
    );
  }

  // TODO (fase 2): validar X-Hub-Signature-256 com WHATSAPP_APP_SECRET
  // TODO (fase 2): parsear payload, menu automático, handoff humano

  await req.json().catch(() => null);

  return NextResponse.json({ received: true });
}
