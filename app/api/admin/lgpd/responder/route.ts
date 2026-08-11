import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { enviarEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  acesso:        "Acesso aos dados",
  exclusao:      "Exclusão de dados",
  retificacao:   "Retificação de dados",
  portabilidade: "Portabilidade de dados",
  oposicao:      "Oposição ao tratamento",
};

function corpoEmail(nome: string, tipo: string, resposta: string): string {
  return `Prezado(a) ${nome},

Em atenção à sua solicitação de ${TIPO_LABEL[tipo] ?? tipo} registrada junto ao Instituto de Pesquisa, Estudos e Capacitação do Comportamento (IPECC), vimos por meio desta comunicar a decisão e o encaminhamento dado:

${resposta}

Esta resposta foi gerada conforme os prazos e direitos estabelecidos pela Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).

Caso tenha dúvidas adicionais, entre em contato pelo canal de privacidade disponível em nosso site.

Atenciosamente,
Encarregado de Proteção de Dados (DPO)
IPECC — Instituto de Pesquisa, Estudos e Capacitação do Comportamento`.trim();
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const body = await req.json() as {
    id: string;
    status: string;
    resposta: string;
  };

  const { id, status, resposta } = body ?? {};
  if (!id || !status) {
    return NextResponse.json({ ok: false, error: "id_e_status_obrigatorios" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: sol, error: selErr } = await supabase
    .from("lgpd_solicitacoes")
    .select("id, nome, email, tipo, status")
    .eq("id", id)
    .maybeSingle();

  if (selErr || !sol) {
    return NextResponse.json({ ok: false, error: "solicitacao_nao_encontrada" }, { status: 404 });
  }

  const { error: updErr } = await supabase
    .from("lgpd_solicitacoes")
    .update({
      status,
      resposta: resposta?.trim() || null,
      respondida_em: status !== "pendente" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  let email_enviado = false;
  const corpo = corpoEmail(sol.nome as string, sol.tipo as string, resposta?.trim() || "(sem mensagem adicional)");

  if (status !== "pendente" && sol.email && resposta?.trim()) {
    const mail = await enviarEmail({
      to: sol.email as string,
      subject: `Sua solicitação LGPD — ${TIPO_LABEL[sol.tipo as string] ?? sol.tipo} — IPECC`,
      text: corpo,
    });
    email_enviado = mail.ok;
  }

  return NextResponse.json({
    ok: true,
    email_enviado,
    conteudo_email: email_enviado ? null : corpo,
  });
}
