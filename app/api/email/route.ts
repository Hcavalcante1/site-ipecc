import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/auth/adminSession";

export const dynamic = "force-dynamic";

type TipoEmail = "contato" | "orcamento" | "admin";

const MAX_MENSAGEM = 5000;
const MAX_NOME = 200;
const MAX_ASSUNTO = 200;

async function getEmailConfig(): Promise<Record<string, string>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase.from("email_config").select("chave, valor");
  const cfg: Record<string, string> = {};
  for (const row of data ?? []) cfg[row.chave] = row.valor;
  return cfg;
}

function subjectPrefix(tipo: TipoEmail) {
  if (tipo === "contato") return "[SITE] Contato";
  if (tipo === "orcamento") return "[SITE] Orçamento";
  return "[SITE] Admin";
}

function emailValido(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const honeypot = String(body?._hp || "").trim();
    if (honeypot) {
      return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
    }

    const tipo = (body?.tipo || "contato") as TipoEmail;
    const nome = String(body?.nome || "").trim().slice(0, MAX_NOME);
    const email = String(body?.email || "").trim();
    const assunto = String(body?.assunto || "").trim().slice(0, MAX_ASSUNTO);
    const mensagem = String(body?.mensagem || "").trim().slice(0, MAX_MENSAGEM);

    if (!["contato", "orcamento", "admin"].includes(tipo)) {
      return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
    }

    if (tipo === "admin") {
      const auth = await verifyAdminSession();
      if (auth.ok === false) {
        return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
      }
      if (!mensagem) {
        return NextResponse.json({ ok: false, error: "Campo obrigatório: mensagem" }, { status: 400 });
      }
    } else {
      if (!nome || !email || !mensagem) {
        return NextResponse.json({ ok: false, error: "Campos obrigatórios: nome, email, mensagem" }, { status: 400 });
      }
      if (!emailValido(email)) {
        return NextResponse.json({ ok: false, error: "E-mail inválido" }, { status: 400 });
      }
    }

    const cfg = await getEmailConfig();
    if (!cfg.smtp_user || !cfg.smtp_pass) {
      return NextResponse.json({ ok: false, error: "Configuração de e-mail não encontrada" }, { status: 500 });
    }

    const transport = nodemailer.createTransport({
      host: cfg.smtp_host || "smtp.zoho.com",
      port: Number(cfg.smtp_port || 465),
      secure: (cfg.smtp_port || "465") === "465",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    const subject = assunto
      ? `${subjectPrefix(tipo)} — ${assunto}`
      : subjectPrefix(tipo);

    const text =
      tipo === "admin"
        ? `Tipo: admin\n\nMensagem:\n${mensagem}`
        : `Tipo: ${tipo}\nNome: ${nome}\nEmail: ${email}\n\nMensagem:\n${mensagem}`;

    await transport.sendMail({
      from: cfg.smtp_user,
      to: cfg.email_destino || cfg.smtp_user,
      subject,
      text,
      ...(tipo !== "admin" && email ? { replyTo: email } : {}),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
