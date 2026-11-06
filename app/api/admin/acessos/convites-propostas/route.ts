import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireMestreSession } from "@/lib/auth/adminSession";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { enviarEmail } from "@/lib/email/mailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch);
}

export async function GET() {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("propostas")
    .select("id, nome, email, criado_em, editais(titulo, processo_id)")
    .order("criado_em", { ascending: false }).limit(300);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const propostas = (data || []).flatMap((row) => {
    const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
    return edital?.processo_id ? [{ id: row.id, nome: row.nome, email: row.email, criado_em: row.criado_em, edital_titulo: edital.titulo, processo_id: edital.processo_id }] : [];
  });
  const { data: convites, error: invitesError } = await admin.from("admin_convites_propostas")
    .select("id, email, proposta_id, expires_at, aceito_em, created_at, propostas(nome)")
    .order("created_at", { ascending: false }).limit(50);
  if (invitesError) return NextResponse.json({ ok: false, error: invitesError.message }, { status: 500 });
  return NextResponse.json({ ok: true, propostas, convites: convites || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const propostaId = String(body.proposta_id || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !propostaId) {
    return NextResponse.json({ ok: false, error: "Informe um e-mail válido e selecione a proposta." }, { status: 400 });
  }
  if (!Array.isArray(body.modulos) || !body.modulos.includes("propostas") || body.modulos.some((m: unknown) => m !== "propostas")) {
    return NextResponse.json({ ok: false, error: "Este convite está limitado ao módulo Propostas." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { data: proposta, error: propostaError } = await admin.from("propostas")
    .select("id, nome, edital_id, editais(processo_id, titulo)").eq("id", propostaId).maybeSingle();
  const edital = Array.isArray(proposta?.editais) ? proposta.editais[0] : proposta?.editais;
  if (propostaError || !proposta || !edital?.processo_id) {
    return NextResponse.json({ ok: false, error: "A proposta não possui processo administrativo vinculado." }, { status: 400 });
  }
  const { data: pending } = await admin.from("admin_convites_propostas").select("id")
    .eq("email", email).eq("proposta_id", propostaId).is("aceito_em", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (pending) return NextResponse.json({ ok: false, error: "Já existe convite pendente para esse e-mail nesta proposta." }, { status: 409 });

  const token = randomBytes(32).toString("hex");
  const { error } = await admin.from("admin_convites_propostas").insert({
    token, email, proposta_id: propostaId, processo_id: edital.processo_id,
    mod_propostas: true, criado_por: auth.userId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || "https://ipecc.org.br").replace(/\/$/, "");
  const link = `${base}/convite/proposta/${token}`;
  const emailResult = await enviarEmail({
    to: email,
    subject: "Convite de acesso a uma proposta — IPECC",
    html: `<div style="font-family:sans-serif;max-width:540px;margin:auto;padding:32px"><h2>Acesso a proposta</h2><p>Você foi convidado para consultar e acompanhar uma proposta no IPECC.</p><p><strong>Proposta:</strong> ${escapeHtml(String(proposta.nome || propostaId))}</p><p><strong>Edital:</strong> ${escapeHtml(String(edital.titulo || "—"))}</p><p><strong>Módulo liberado:</strong> Propostas</p><p><a href="${link}">Aceitar convite</a></p><p>O convite expira em 7 dias e só pode ser aceito com este e-mail.</p></div>`,
  });
  return NextResponse.json({ ok: true, link, email_enviado: emailResult.ok });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: invite, error: inviteError } = await admin.from("admin_convites_propostas").select("id, email, proposta_id, aceito_em").eq("id", id).maybeSingle();
  if (inviteError || !invite) return NextResponse.json({ ok: false, error: inviteError?.message || "Convite não encontrado." }, { status: 404 });
  if (invite.aceito_em) {
    const { data: profile } = await admin.from("admin_perfis").select("user_id").eq("email", invite.email).maybeSingle();
    if (profile?.user_id) {
      const { error } = await admin.from("admin_proposta_escopos").delete().eq("user_id", profile.user_id).eq("proposta_id", invite.proposta_id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, acesso_removido: true });
  }
  const { error } = await admin.from("admin_convites_propostas").delete().eq("id", id).is("aceito_em", null);
  return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}