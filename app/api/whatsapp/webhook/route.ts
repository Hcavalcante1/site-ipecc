import { NextRequest, NextResponse } from "next/server";
import { processWebhookPost } from "@/lib/whatsapp/processWebhookPost";
import { verifyMetaWebhookGet } from "@/lib/whatsapp/verifyWebhookGet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const result = verifyMetaWebhookGet({
    mode: req.nextUrl.searchParams.get("hub.mode"),
    token: req.nextUrl.searchParams.get("hub.verify_token"),
    challenge: req.nextUrl.searchParams.get("hub.challenge"),
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  });

  if (result.ok === false) {
    if (result.reason === "missing_config") {
      return NextResponse.json(
        { error: "whatsapp_not_configured" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(result.challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const result = await processWebhookPost(
    rawBody,
    signature,
    process.env.WHATSAPP_APP_SECRET
  );

  if (!result.ok) {
    if (result.status === 503) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 503 }
      );
    }
    const err = result.status === 400 || result.status === 401 ? result.error : "error";
    return NextResponse.json({ error: err }, { status: result.status });
  }

  return NextResponse.json({
    received: true,
    processed: result.processed,
    results: result.results,
  });
}
