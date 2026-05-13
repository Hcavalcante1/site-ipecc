import { NextResponse } from "next/server";
import { Resend } from "resend";

type TipoEmail = "contato" | "orcamento" | "admin";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

const resend = new Resend(getEnv("RESEND_API_KEY"));

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const tipo = (body?.tipo || "contato") as TipoEmail;
    const nome = String(body?.nome || "").trim();
    const email = String(body?.email || "").trim();
    const assunto = String(body?.assunto || "").trim();
    const mensagem = String(body?.mensagem || "").trim();

    if (!["contato", "orcamento", "admin"].includes(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo inválido. Use: contato | orcamento | admin" },
        { status: 400 }
      );
    }

    // Para "admin", você pode mandar sem nome/email do usuário (ex: alertas do sistema)
    if (tipo !== "admin") {
      if (!nome || !email || !mensagem) {
        return NextResponse.json(
          { ok: false, error: "Campos obrigatórios: nome, email, mensagem" },
          { status: 400 }
        );
      }
    } else {
      if (!mensagem) {
        return NextResponse.json(
          { ok: false, error: "Campo obrigatório: mensagem" },
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

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      // replyTo só faz sentido quando é mensagem de usuário
      ...(tipo !== "admin" ? { replyTo: email } : {}),
      text,
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}