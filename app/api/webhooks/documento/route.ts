import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { concluirAssinaturaDocumentoWebhook } from "@/lib/documentos/signatureService";
import { documentoWebhookSecret } from "@/lib/documentos/signature/DocumentoProvider";

export const runtime = "nodejs";

function extrairEnvelopeId(body: Record<string, unknown>): string | null {
  const payload = (body.payload || body.data || body) as Record<
    string,
    unknown
  >;
  const candidates = [
    payload?.id,
    payload?.envelopeId,
    payload?.documentId,
    body.envelopeId,
    body.documentId,
    body.id,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return null;
}

function extrairEvento(body: Record<string, unknown>): string {
  return String(
    body.event || body.type || body.name || body.eventType || ""
  ).toUpperCase();
}

function secretOk(req: NextRequest, rawBody: string): boolean {
  const expected = documentoWebhookSecret();
  if (!expected) return true;

  const header =
    req.headers.get("x-documento-secret") ||
    req.headers.get("x-documenso-secret") ||
    req.headers.get("x-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (header && header === expected) return true;

  const sig =
    req.headers.get("x-documento-signature") ||
    req.headers.get("x-documenso-signature") ||
    req.headers.get("x-webhook-signature") ||
    "";
  if (sig) {
    const dig = createHmac("sha256", expected).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(dig);
      const b = Buffer.from(sig.replace(/^sha256=/i, ""));
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** Webhook do motor de assinatura → Storage GD. URL: /api/webhooks/documento */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!secretOk(req, raw)) {
    return NextResponse.json(
      { ok: false, error: "Webhook não autorizado." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const event = extrairEvento(body);
  const envelopeId = extrairEnvelopeId(body);
  if (!envelopeId) {
    return NextResponse.json(
      { ok: false, error: "envelope id ausente no payload." },
      { status: 400 }
    );
  }

  const completed =
    !event ||
    event.includes("COMPLETED") ||
    event.includes("SIGNED") ||
    event === "DOCUMENT.COMPLETED" ||
    event === "DOCUMENT_COMPLETED";

  if (!completed) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      event,
      envelopeId,
    });
  }

  const result = await concluirAssinaturaDocumentoWebhook({
    envelopeId,
    event,
  });

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, signature: result.data });
}
