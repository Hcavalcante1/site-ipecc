import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

function remetente() {
  return (
    String(process.env.RESEND_FROM || "").trim() ||
    String(process.env.EMAIL_FROM || "").trim() ||
    "noreply@ipecc.org.br"
  );
}

async function getSessionUser(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: org } = await supabase
    .from("organizacoes")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!org) return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });

  const { data: convites, error } = await supabase
    .from("convites_org")
    .select("id, email, papel, aceito_em, expires_at, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: convites ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { email, papel } = (await req.json()) as { email?: string; papel?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "email_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: org } = await supabase
    .from("organizacoes")
    .select("id, nome, slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!org) return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });

  const { data: existente } = await supabase
    .from("convites_org")
    .select("id, aceito_em, expires_at")
    .eq("org_id", org.id)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existente && !existente.aceito_em && new Date(existente.expires_at) > new Date()) {
    return NextResponse.json({ ok: false, error: "convite_ja_pendente" }, { status: 409 });
  }

  const { data: convite, error: insErr } = await supabase
    .from("convites_org")
    .insert({
      org_id: org.id,
      email: email.toLowerCase(),
      papel: papel ?? "operador",
      convidado_por: user.id,
    })
    .select("token")
    .single();

  if (insErr || !convite) {
    return NextResponse.json({ ok: false, error: insErr?.message ?? "insert_failed" }, { status: 500 });
  }

  const siteUrl =
    String(process.env.NEXT_PUBLIC_SITE_URL || "").trim() || "https://ipecc.org.br";
  const link = `${siteUrl}/convite/${convite.token}`;

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: remetente(),
        to: email,
        subject: `Convite para colaborar em ${org.nome} — IPECC`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="margin:0 0 16px;color:#1d4ed8">Você foi convidado!</h2>
            <p style="color:#374151">
              Você recebeu um convite para colaborar na organização
              <strong>${org.nome}</strong> na plataforma IPECC.
            </p>
            <p style="color:#374151">Papel: <strong>${papel ?? "operador"}</strong></p>
            <div style="margin:28px 0">
              <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
                Aceitar convite →
              </a>
            </div>
            <p style="color:#9ca3af;font-size:13px">
              O link expira em 7 dias.<br>
              Se não reconhecer este convite, ignore este e-mail.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:11px">IPECC — Plataforma de gestão institucional</p>
          </div>
        `,
      });
    } catch {
      // email falhou mas convite foi criado — retorna sucesso com aviso
      return NextResponse.json({ ok: true, link, email_enviado: false });
    }
  }

  return NextResponse.json({ ok: true, link, email_enviado: !!apiKey });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("convites_org").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
