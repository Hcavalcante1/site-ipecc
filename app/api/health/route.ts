import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check local/staging — não expõe segredos, só presença de env e ping leve no DB.
 */
export async function GET() {
  const env = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const envOk = Object.values(env).every(Boolean);

  let database: "ok" | "error" | "skipped" = "skipped";
  let databaseError: string | undefined;

  if (envOk) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
      const { error } = await supabaseAdmin
        .from("propostas")
        .select("id")
        .limit(1);

      if (error) {
        database = "error";
        databaseError = error.message;
      } else {
        database = "ok";
      }
    } catch (err) {
      database = "error";
      databaseError = err instanceof Error ? err.message : String(err);
    }
  }

  const ok = envOk && database === "ok";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      env,
      database,
      ...(databaseError ? { databaseError } : {}),
    },
    { status: ok ? 200 : 503 }
  );
}
