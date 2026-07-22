-- Rate limit persistido no banco — funciona em ambientes serverless (Vercel, Lambda).
-- Aplicar no Supabase SQL Editor antes de deployar.

CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT        PRIMARY KEY,
  count     INTEGER     NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL
);

-- Índice para limpeza de entradas expiradas (opcional, cronjob)
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);

-- Função atômica de upsert + verificação (evita race condition em serverless)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key       TEXT,
  p_window_ms BIGINT,
  p_max       INTEGER
)
RETURNS TABLE (
  hit_count   INTEGER,
  reset_at    TIMESTAMPTZ,
  limited     BOOLEAN,
  retry_after INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now      TIMESTAMPTZ := NOW();
  v_reset    TIMESTAMPTZ := v_now + (p_window_ms || ' milliseconds')::INTERVAL;
  v_count    INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_reset)
  ON CONFLICT (key) DO UPDATE SET
    count    = CASE WHEN rate_limits.reset_at <= v_now THEN 1
                    ELSE rate_limits.count + 1 END,
    reset_at = CASE WHEN rate_limits.reset_at <= v_now THEN v_reset
                    ELSE rate_limits.reset_at END
  RETURNING rate_limits.count, rate_limits.reset_at
  INTO v_count, v_reset_at;

  RETURN QUERY SELECT
    v_count,
    v_reset_at,
    v_count > p_max,
    GREATEST(0, EXTRACT(EPOCH FROM (v_reset_at - v_now))::INTEGER);
END;
$$;

-- Permissão para a service role
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, BIGINT, INTEGER) TO service_role;
