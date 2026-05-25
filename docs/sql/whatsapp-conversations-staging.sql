-- WhatsApp bot — persistência opcional (staging).
-- Aplicar manualmente no Supabase quando WHATSAPP_PERSIST_SUPABASE=1.
-- Não aplicar em produção sem autorização.

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  wa_id text PRIMARY KEY,
  state text NOT NULL DEFAULT 'idle',
  unknown_count integer NOT NULL DEFAULT 0,
  from_site_hint boolean NOT NULL DEFAULT false,
  human_assigned_to text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_state_idx
  ON whatsapp_conversations (state);

COMMENT ON TABLE whatsapp_conversations IS
  'Estado do bot WhatsApp por wa_id (Cloud API).';

-- RLS: sem acesso anon; leitura/escrita admin via API (supabaseAdmin + verifyAdminSession).
-- Não habilitar SELECT para authenticated sem política explícita.
