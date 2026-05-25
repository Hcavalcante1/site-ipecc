import { NextRequest, NextResponse } from "next/server";
import { parseMetaWebhookPayload } from "@/lib/whatsapp/parseWebhook";
import { verifyMetaWebhookSignature } from "@/lib/whatsapp/verifySignature";
import { handleInboundMessage } from "@/lib/whatsapp/handleInbound";
import { logWhatsApp } from "@/lib/whatsapp/logWhatsApp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();

  if (!appSecret) {
    return NextResponse.json(
      { ok: false, reason: "whatsapp_not_configured" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    logWhatsApp("webhook_invalid_signature", {});
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = parseMetaWebhookPayload(
    body as Parameters<typeof parseMetaWebhookPayload>[0]
  );

  const results = [];
  for (const inbound of messages) {
    results.push(await handleInboundMessage(inbound));
  }

  logWhatsApp("webhook_post", { count: messages.length });

  return NextResponse.json({
    received: true,
    processed: messages.length,
    results,
  });
}
