import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyAdminSession } from "@/lib/auth/adminSession";

export const dynamic = "force-dynamic";

type TipoEmail = "contato" | "orcamento" | "admin";

const TIPOS_PUBLICOS: TipoEmail[] = ["contato", "orcamento"];
const MAX_MENSAGEM = 5000;
const MAX_NOME = 200;
const MAX_ASSUNTO = 200;

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

function getResend() {
  return new Resend(getEnv("RESEND_API_KEY"));
}

function pickFrom(tipo: TipoEmail) {
  if (tipo === "contato") return getEnv("EMAIL_CONTATO");
  if (tipo === "orcamento") return getEnv("EMAIL_ORCAMENTO");
  return getEnv("EMAIL_ADMIN");
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
      return NextResponse.json(
        { ok: false, error: "Tipo inválido. Use: contato | orcamento | admin" },
        { status: 400 }
      );
    }

    if (tipo === "admin") {
      const auth = await verifyAdminSession();
      if (auth.ok === false) {
        return NextResponse.json(
          { ok: false, error: auth.message },
          { status: auth.status }
        );
      }
      if (!mensagem) {
        return NextResponse.json(
          { ok: false, error: "Campo obrigatório: mensagem" },
          { status: 400 }
        );
      }
    } else {
      if (!nome || !email || !mensagem) {
        return NextResponse.json(
          { ok: false, error: "Campos obrigatórios: nome, email, mensagem" },
          { status: 400 }
        );
      }
      if (!emailValido(email)) {
        return NextResponse.json(
          { ok: false, error: "E-mail inválido" },
          { status: 400 }
        );
      }
    }

    const to = getEnv("EMAIL_DESTINO");
    const from = pickFrom(tipo);

    const subject = assunto
      ? `${subjectPrefix(tipo)} — ${assunto}`
      : subjectPrefix(tipo);

    const text =
      tipo === "admin"
        ? `Tipo: admin\n\nMensagem:\n${mensagem}`
        : `Tipo: ${tipo}\nNome: ${nome}\nEmail: ${email}\n\nMensagem:\n${mensagem}`;

    const { error } = await getResend().emails.send({
      from,
      to,
      subject,
      ...(tipo !== "admin" ? { replyTo: email } : {}),
      text,
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
