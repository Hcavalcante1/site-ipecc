import {
  validateWhatsAppLeadForm,
  type WhatsAppLeadFormFields,
} from "./publicWhatsApp";

export type WhatsAppLeadPersistPayload = WhatsAppLeadFormFields & {
  pagina_origem?: string;
  user_agent?: string;
};

export function isWhatsAppLeadPersistEnabled(): boolean {
  return process.env.WHATSAPP_LEADS_PERSIST_SUPABASE === "1";
}

export async function persistWhatsAppLead(
  payload: WhatsAppLeadPersistPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const validation = validateWhatsAppLeadForm(payload);
  if (!validation.ok) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");

  const { error } = await supabaseAdmin.from("whatsapp_leads").insert({
    nome: payload.nome.trim(),
    organizacao: payload.organizacao.trim() || null,
    telefone: payload.telefone.trim(),
    email: payload.email.trim() || null,
    assunto: payload.assunto.trim(),
    mensagem: payload.mensagem.trim() || null,
    pagina_origem: payload.pagina_origem?.trim() || null,
    user_agent: payload.user_agent?.trim() || null,
  });

  if (error) {
    if (/whatsapp_leads/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return {
        ok: false,
        message: "Tabela whatsapp_leads ausente. Aplique docs/sql/whatsapp-leads-staging.sql no staging.",
      };
    }
    return { ok: false, message: "Não foi possível registrar o lead." };
  }

  return { ok: true };
}
