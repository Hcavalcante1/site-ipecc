/**
 * Valida painel flutuante WhatsApp (pré-cadastro + URLs wa.me).
 * Uso: npm run validar:whatsapp-public-chat
 */

import {
  PUBLIC_WHATSAPP_CHAT_OPTIONS,
  PUBLIC_WHATSAPP_SUBJECT_OPTIONS,
  SITE_WHATSAPP_DEFAULT_MESSAGE,
  buildWhatsAppUrl,
  buildWhatsAppUrlFromLead,
  formatWhatsAppLeadMessage,
  getWhatsAppUrlForChatOption,
  getWhatsAppSubjectFromPathname,
  isWhatsAppLeadHref,
  validateWhatsAppLeadForm,
} from "../lib/whatsapp/publicWhatsApp";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

function main() {
  assert("7 assuntos", PUBLIC_WHATSAPP_SUBJECT_OPTIONS.length === 7);

  const subjectLabels = PUBLIC_WHATSAPP_SUBJECT_OPTIONS.map((o) => o.label);
  assert(
    "labels de assunto",
    subjectLabels.join("|") ===
      "Projetos|Editais|Propostas|Transparência|Eventos|Falar com a equipe|Outro"
  );

  const sample = {
    nome: "Maria Silva",
    organizacao: "ONG Exemplo",
    telefone: "(11) 99999-0000",
    email: "maria@exemplo.org",
    assunto: "projetos",
    mensagem: "Gostaria de saber mais.",
  };

  const message = formatWhatsAppLeadMessage(sample);
  assert("mensagem lead contém nome", message.includes("Nome: Maria Silva"));
  assert(
    "mensagem lead contém assunto",
    message.includes("Assunto: Projetos")
  );
  assert(
    "mensagem lead abertura",
    message.startsWith("Olá, vim pelo site do IPECC.")
  );

  const leadUrl = buildWhatsAppUrlFromLead(sample);
  assert("URL lead wa.me", leadUrl.startsWith("https://wa.me/"));
  assert(
    "URL lead texto",
    new URL(leadUrl).searchParams.get("text") === message
  );

  const invalid = validateWhatsAppLeadForm({
    nome: "",
    organizacao: "",
    telefone: "",
    email: "invalido",
    assunto: "",
    mensagem: "",
  });
  assert("validação rejeita vazio", !invalid.ok);
  assert("validação nome", Boolean(invalid.errors.nome));
  assert("validação telefone", Boolean(invalid.errors.telefone));
  assert("validação assunto", Boolean(invalid.errors.assunto));
  assert("validação email", Boolean(invalid.errors.email));

  const valid = validateWhatsAppLeadForm({
    nome: "João",
    organizacao: "",
    telefone: "11999990000",
    email: "",
    assunto: "outro",
    mensagem: "",
  });
  assert("validação aceita mínimo", valid.ok);

  assert("6 opções legado", PUBLIC_WHATSAPP_CHAT_OPTIONS.length === 6);

  for (const opt of PUBLIC_WHATSAPP_CHAT_OPTIONS) {
    const url = getWhatsAppUrlForChatOption(opt.id);
    assert(`URL legado ${opt.id}`, url.startsWith("https://wa.me/"));
    const text = new URL(url).searchParams.get("text");
    assert(`mensagem legado ${opt.id}`, text === opt.message);
  }

  const fallback = buildWhatsAppUrl();
  assert("fallback default", fallback.startsWith("https://wa.me/"));
  assert(
    "mensagem padrão",
    new URL(fallback).searchParams.get("text") === SITE_WHATSAPP_DEFAULT_MESSAGE
  );

  assert("href wa.me", isWhatsAppLeadHref("https://wa.me/5511999990000"));
  assert("href /contato", isWhatsAppLeadHref("/contato"));
  assert("href projetos não", !isWhatsAppLeadHref("/projetos"));
  assert("rota /projetos", getWhatsAppSubjectFromPathname("/projetos") === "projetos");
  assert("rota /editais", getWhatsAppSubjectFromPathname("/editais") === "editais");
  assert("rota home", getWhatsAppSubjectFromPathname("/") === "");

  console.log("\nPainel público WhatsApp (lead form) validado.");
}

main();
