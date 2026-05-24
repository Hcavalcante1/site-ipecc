-- PASSO 5 — Após hardening-propostas-rls-APLICAR.sql
-- Corrige: "new row violates row-level security policy" no INSERT anon
-- Execute no SQL Editor (staging) se validate:upload-proposta falhar após segurança OK

GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.propostas TO anon;

DROP POLICY IF EXISTS "propostas_insert_anon" ON public.propostas;
CREATE POLICY "propostas_insert_anon"
  ON public.propostas
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Conferir: deve existir propostas_insert_anon (INSERT, {anon})
-- SELECT para anon continua sem política (segurança OK)
