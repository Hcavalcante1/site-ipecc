export function loadConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  }
  return {
    supabaseUrl,
    supabaseKey,
    workerId: process.env.DIGITAL_WORKER_ID || "worker-local",
    pollMs: Number(process.env.DIGITAL_WORKER_POLL_INTERVAL_MS || 15000),
    maxAttempts: Number(process.env.DIGITAL_MAX_PUBLISH_ATTEMPTS || 4),
    dryRun: process.env.DIGITAL_PUBLISH_DRY_RUN !== "false",
    lockTtlMs: Number(process.env.DIGITAL_LOCK_TTL_MS || 600000),
    port: Number(process.env.PORT || 8791),
  };
}

export type WorkerConfig = ReturnType<typeof loadConfig>;
