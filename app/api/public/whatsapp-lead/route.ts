import { NextResponse } from "next/server";
import {
  isWhatsAppLeadPersistEnabled,
  persistWhatsAppLead,
  type WhatsAppLeadPersistPayload,
} from "@/lib/whatsapp/leadPersist";

export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "local";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

function parseBody(raw: unknown): WhatsAppLeadPersistPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const str = (k: string): string =>
    typeof b[k] === "string" ? (b[k] as string) : "";
  return {
    nome: str("nome"),
    organizacao: str("organizacao"),
    telefone: str("telefone"),
    email: str("email"),
    assunto: str("assunto"),
    mensagem: str("mensagem"),
    pagina_origem: str("pagina_origem"),
    user_agent: str("user_agent"),
  };
}

export async function POST(req: Request) {
  if (!isWhatsAppLeadPersistEnabled()) {
    return NextResponse.json({ ok: false, disabled: true }, { status: 503 });
  }

  const key = clientKey(req);
  if (rateLimited(key)) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde um minuto." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido." }, { status: 400 });
  }

  const payload = parseBody(body);
  if (!payload) {
    return NextResponse.json({ ok: false, message: "Payload inválido." }, { status: 400 });
  }

  const result = await persistWhatsAppLead(payload);
  if (result.ok === false) {
    const status = result.message.includes("ausente") ? 503 : 400;
    return NextResponse.json(
      { ok: false, message: result.message },
      { status }
    );
  }

  return NextResponse.json({ ok: true });
}
