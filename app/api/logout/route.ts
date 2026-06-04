import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/auth/supabaseRouteCookies";

export async function POST() {
  const supabase = createSupabaseRouteClient();
  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ipecc_admin_gate", "", { path: "/", maxAge: 0 });

  return res;
}
