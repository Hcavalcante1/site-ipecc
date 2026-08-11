import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { enviarEmail } from "@/lib/email/mailer";

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

  const mail = await enviarEmail({
    to: destinatario.trim(),
    subject: "✅ Teste de e-mail — IPECC Plataforma",
    text: [
      "Olá,",
      "",
      "Este é um e-mail de teste enviado pela Plataforma IPECC para confirmar",
      "que a integração com o serviço de e-mail está funcionando corretamente.",
      "",
      `Enviado em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      "Se você recebeu esta mensagem, o envio de e-mails está configurado.",
      "",
      "— IPECC Sistema",
    ].join("\n"),
  });

  if (!mail.ok) {
    return NextResponse.json(
      { ok: false, error: "email_nao_configurado", detalhe: mail.error },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
