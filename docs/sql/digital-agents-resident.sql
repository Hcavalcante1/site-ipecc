-- Agente residente Digital (Windows) — heartbeat remoto para o admin
-- Additive. IF NOT EXISTS. Sem DROP.
-- Pré-requisito: digital-redes-automation-phase1.sql

CREATE TABLE IF NOT EXISTS public.digital_agents (
  agent_id text PRIMARY KEY,
  machine_name text,
  status text NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'offline', 'busy', 'error')),
  last_heartbeat_at timestamptz,
  meta_session_status text NOT NULL DEFAULT 'unknown'
    CHECK (meta_session_status IN (
      'unknown', 'ok', 'expired', 'reconnect_required', 'none'
    )),
  worker_version text,
  current_job_id uuid,
  dry_run boolean NOT NULL DEFAULT true,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_agents_heartbeat_idx
  ON public.digital_agents (last_heartbeat_at DESC);

COMMENT ON TABLE public.digital_agents IS
  'Heartbeat dos workers Playwright (PC residente / VPS). Sem senhas.';
COMMENT ON COLUMN public.digital_agents.agent_id IS
  'DIGITAL_WORKER_ID do processo (ex.: worker-pc).';
COMMENT ON COLUMN public.digital_agents.meta_session_status IS
  'Resumo das contas browser: ok | expired | reconnect_required | none | unknown';
