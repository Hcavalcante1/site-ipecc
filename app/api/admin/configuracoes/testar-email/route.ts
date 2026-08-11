import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const { destinatario } = (await req.json()) as { destinatario?: string };

  if (!destinatario?.trim()) {
    return NextResponse.json({ ok: false, error: "destinatario_obrigatorio" }, { status: 400 });
  }

  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const from   = String(process.env.RESEND_FROM ?? "").trim() || "IPECC <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "resend_nao_configurado", detalhe: "RESEND_API_KEY não está definida." },
      { status: 503 }
    );
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to:      destinatario.trim(),
      subject: "✅ Teste de e-mail — IPECC Plataforma",
      text:    [
        "Olá,",
        "",
        "Este é um e-mail de teste enviado pela Plataforma IPECC para confirmar",
        "que a integração com o serviço de e-mail está funcionando corretamente.",
        "",
        `Configuração: FROM=${from}`,
        `Enviado em: ${new Date().toLocaleString("pt-BR")}`,
        "",
        "Se você recebeu esta mensagem, o envio de e-mails está configurado.",
        "",
        "— IPECC Sistema",
      ].join("\n"),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, from });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
