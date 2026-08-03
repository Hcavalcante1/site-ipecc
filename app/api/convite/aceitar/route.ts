import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ ok: false, error: "token_required" }, { status: 400 });

  const auth = req.headers.get("authorization") ?? "";
  const accessToken = auth.replace("Bearer ", "").trim();
  if (!accessToken) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: convite, error: convErr } = await supabase
    .from("convites_org")
    .select("id, org_id, email, papel, aceito_em, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (convErr || !convite) {
    return NextResponse.json({ ok: false, error: "convite_invalido" }, { status: 404 });
  }
  if (convite.aceito_em) {
    return NextResponse.json({ ok: false, error: "convite_ja_aceito" }, { status: 409 });
  }
  if (new Date(convite.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: "convite_expirado" }, { status: 410 });
  }
  if (convite.email !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ ok: false, error: "email_nao_corresponde" }, { status: 403 });
  }

  const { error: memErr } = await supabase.from("org_membros").upsert({
    org_id: convite.org_id,
    user_id: user.id,
    papel: convite.papel,
    ativo: true,
  }, { onConflict: "org_id,user_id" });

  if (memErr) return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });

  await supabase
    .from("convites_org")
    .update({ aceito_em: new Date().toISOString() })
    .eq("id", convite.id);

  return NextResponse.json({ ok: true, org_id: convite.org_id });
}
