-- Pré-cadastro WhatsApp do site público (staging).
-- Aplicar manualmente no Supabase SOMENTE quando a equipe autorizar persistência.
-- Enquanto isso o site só abre wa.me (sem INSERT).

CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  organizacao text,
  telefone text NOT NULL,
  email text,
  assunto text NOT NULL,
  mensagem text,
  pagina_origem text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS whatsapp_leads_created_at_idx
  ON whatsapp_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_leads_assunto_idx
  ON whatsapp_leads (assunto);

COMMENT ON TABLE whatsapp_leads IS
  'Leads do formulário público antes de abrir wa.me (opcional).';

-- RLS: sem política para anon/authenticated — INSERT só via service role (API).
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
