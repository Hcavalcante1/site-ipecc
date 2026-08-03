import { NextResponse } from "next/server";

export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "local";
}

export function rateLimited(key: string): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || now >= e.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > RATE_MAX;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

export function ok(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data, ...meta }, { headers: CORS });
}

export function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status, headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
