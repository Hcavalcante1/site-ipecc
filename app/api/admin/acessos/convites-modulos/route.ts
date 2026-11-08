import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireMestreSession } from "@/lib/auth/adminSession";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { enviarEmail } from "@/lib/email/mailer";

const MODULOS = ["editais", "transparencia", "noticias", "eventos", "digital"] as const
type Modulo = (typeof MODULOS)[number];
const LABEL: Record<Modulo, string> = { editais: "Editais", transparencia: "Transparência", noticias: "Notícias", eventos: "Eventos", digital: "Digital" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch);

export async function GET() {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const admin = getSupabaseAdmin();
  const [{ data: processos, error: processosError }, { data: convites, error: convitesError }] = await Promise.all([
    admin.from("processos_contratacao").select("id, titulo, tipo, status").order("titulo"),
    admin.from("admin_convites_propostas").select("id, email, processo_id, proposta_id, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital, mod_documentos, expires_at, aceito_em, created_at").is("proposta_id", null).order("created_at", { ascending: false }).limit(50),
  ]);
  if (processosError || convitesError) return NextResponse.json({ ok: false, error: processosError?.message || convitesError?.message }, { status: 500 });
  return NextResponse.json({ ok: true, processos: processos || [], convites: (convites || []).map((c) => ({ ...c, mod_projetos: false, mod_documentos: false })) });
}

export async function POST(req: NextRequest) {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const processoId = String(body.processo_id || "").trim();
  const selected = Array.isArray(body.modulos) ? [...new Set(body.modulos)] as string[] : [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !processoId) return NextResponse.json({ ok: false, error: "Informe um e-mail válido e selecione o processo." }, { status: 400 });
  if (!selected.length || selected.some((modulo) => !MODULOS.includes(modulo as Modulo))) return NextResponse.json({ ok: false, error: "Marque ao menos um módulo válido." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: processo, error: processoError } = await admin.from("processos_contratacao").select("id, titulo").eq("id", processoId).maybeSingle();
  if (processoError || !processo) return NextResponse.json({ ok: false, error: "Processo não encontrado." }, { status: 404 });
  const { data: pending } = await admin.from("admin_convites_propostas").select("id").eq("email", email).eq("processo_id", processoId).is("proposta_id", null).is("aceito_em", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (pending) return NextResponse.json({ ok: false, error: "Já existe convite pendente para este e-mail e processo." }, { status: 409 });
  const token = randomBytes(32).toString("hex");
  const flags = Object.fromEntries(MODULOS.map((modulo) => [`mod_${modulo}`, selected.includes(modulo)]));
  const { error } = await admin.from("admin_convites_propostas").insert({ token, email, proposta_id: null, processo_id: processoId, ...flags, mod_projetos: false, mod_documentos: false, criado_por: auth.userId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  // Convites de acesso devem sempre apontar para o domínio oficial do IPECC. A variável global
  // NEXT_PUBLIC_SITE_URL pode ser configurada para outros serviços e não é confiável para esse fluxo.
  const base = "https://www.ipecc.org.br";
  const link = `${base}/convite/acesso/${token}`;
  const labels = selected.map((modulo) => LABEL[modulo as Modulo]);
  const emailResult = await enviarEmail({ to: email, subject: "Convite de acesso ao IPECC", html: `<div style="font-family:sans-serif;max-width:540px;margin:auto;padding:32px"><h2>Convite de acesso</h2><p>Você foi convidado para acessar módulos do processo <strong>${escapeHtml(processo.titulo)}</strong>.</p><p><strong>Módulos liberados:</strong> ${labels.map(escapeHtml).join(", ")}</p><p><a href="${link}">Aceitar convite</a></p><p>O convite expira em 7 dias e só pode ser aceito com este e-mail.</p></div>` });
  return NextResponse.json({ ok: true, link, email_enviado: emailResult.ok });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireMestreSession();
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: invite, error: inviteError } = await admin.from("admin_convites_propostas").select("id, email, processo_id, proposta_id, aceito_em, escopo_id").eq("id", id).is("proposta_id", null).maybeSingle();
  if (inviteError || !invite) return NextResponse.json({ ok: false, error: inviteError?.message || "Convite não encontrado." }, { status: 404 });
  if (invite.aceito_em) {
    if (invite.escopo_id) {
      const { error } = await admin.from("admin_escopos").delete().eq("id", invite.escopo_id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, acesso_removido: true });
  }
  const { error } = await admin.from("admin_convites_propostas").delete().eq("id", id).is("aceito_em", null);
  return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
