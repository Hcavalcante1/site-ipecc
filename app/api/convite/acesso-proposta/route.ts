import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function carregarConvite(token: string) {
  const admin = getSupabaseAdmin();
  const { data: invite } = await admin.from("admin_convites_propostas")
    .select("id, email, proposta_id, processo_id, expires_at, aceito_em, mod_propostas")
    .eq("token", token).maybeSingle();
  if (!invite) return null;
  const { data: proposta } = await admin.from("propostas").select("id, nome, editais(titulo)").eq("id", invite.proposta_id).maybeSingle();
  const edital = Array.isArray(proposta?.editais) ? proposta.editais[0] : proposta?.editais;
  return { ...invite, proposta_nome: proposta?.nome || "Proposta", edital_titulo: edital?.titulo || "—" };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const invite = token ? await carregarConvite(token) : null;
  if (!invite) return NextResponse.json({ ok: false, error: "convite_invalido" }, { status: 404 });
  return NextResponse.json({ ok: true, convite: invite });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !bearer) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const invite = await carregarConvite(String(token));
  if (!invite) return NextResponse.json({ ok: false, error: "convite_invalido" }, { status: 404 });
  if (invite.aceito_em) return NextResponse.json({ ok: false, error: "convite_ja_aceito" }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ ok: false, error: "convite_expirado" }, { status: 410 });
  if ((user.email || "").toLowerCase() !== invite.email.toLowerCase()) return NextResponse.json({ ok: false, error: "email_nao_corresponde" }, { status: 403 });

  const { data: profile } = await admin.from("admin_perfis").select("user_id, ativo").eq("user_id", user.id).maybeSingle();
  if (profile && !profile.ativo) return NextResponse.json({ ok: false, error: "perfil_inativo" }, { status: 403 });
  if (!profile) {
    const { error } = await admin.from("admin_perfis").insert({ user_id: user.id, email: user.email, papel: "externo", ativo: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const { error: scopeError } = await admin.from("admin_proposta_escopos").upsert({
    user_id: user.id, proposta_id: invite.proposta_id, processo_id: invite.processo_id, mod_propostas: invite.mod_propostas,
  }, { onConflict: "user_id,proposta_id" });
  if (scopeError) return NextResponse.json({ ok: false, error: scopeError.message }, { status: 500 });
  const { error: acceptedError } = await admin.from("admin_convites_propostas").update({ aceito_em: new Date().toISOString() }).eq("id", invite.id).is("aceito_em", null);
  if (acceptedError) return NextResponse.json({ ok: false, error: acceptedError.message }, { status: 500 });
  return NextResponse.json({ ok: true, proposta_id: invite.proposta_id });
}