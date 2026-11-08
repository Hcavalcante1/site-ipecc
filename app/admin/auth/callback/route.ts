import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

function caminhoLocal(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://ipecc.invalid");
    return url.origin === "https://ipecc.invalid" ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = caminhoLocal(url.searchParams.get("next")) || "/admin";
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const destinoErro = new URL(next, url.origin);
  destinoErro.searchParams.set("auth_error", "callback");
  return NextResponse.redirect(destinoErro);
}
