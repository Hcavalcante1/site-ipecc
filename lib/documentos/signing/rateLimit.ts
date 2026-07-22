/**
 * Rate limit persistido no Supabase — funciona em serverless (Vercel).
 * Requer docs/sql/rate-limits-serverless.sql aplicado no banco.
 * Fallback automático para in-memory se a tabela ainda não existir.
 */
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type HitEntry = { count: number; resetAt: number };
const fallbackHits = new Map<string, HitEntry>();

const DEFAULT_WINDOW_MS = 60_000;

export const RATE_ASSINATURA    = { windowMs: DEFAULT_WINDOW_MS, max: 20 } as const;
export const RATE_OTP           = { windowMs: DEFAULT_WINDOW_MS, max: 8  } as const;
export const RATE_VALIDAR_PUBLICO = { windowMs: DEFAULT_WINDOW_MS, max: 30 } as const;

export async function checkRateLimit(
  key: string,
  opts?: { windowMs?: number; max?: number }
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const max      = opts?.max ?? 10;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_window_ms: windowMs,
      p_max: max,
    });

    if (error) {
      // Tabela/função ainda não existe — usa fallback in-memory
      if (/does not exist|42P01|42883/i.test(error.message || "")) {
        return checkRateLimitInMemory(key, windowMs, max);
      }
      // Outro erro de banco — falha aberta (não bloqueia o usuário)
      console.error("[rateLimit] Supabase error:", error.message);
      return { limited: false, retryAfterSec: 0 };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { limited: false, retryAfterSec: 0 };

    return {
      limited: Boolean(row.limited),
      retryAfterSec: Number(row.retry_after ?? 0),
    };
  } catch (e) {
    console.error("[rateLimit] unexpected error:", e);
    return { limited: false, retryAfterSec: 0 };
  }
}

function checkRateLimitInMemory(
  key: string,
  windowMs: number,
  max: number
): { limited: boolean; retryAfterSec: number } {
  const now   = Date.now();
  const entry = fallbackHits.get(key);

  if (!entry || now >= entry.resetAt) {
    fallbackHits.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSec: 0 };
  }

  entry.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > max) {
    return { limited: true, retryAfterSec };
  }
  return { limited: false, retryAfterSec: 0 };
}

export function assinaturaRateKey(
  kind:
    | "iniciar"
    | "otp"
    | "confirmar"
    | "lote-iniciar"
    | "lote-confirmar"
    | "adv-criar"
    | "adv-consent"
    | "adv-mfa"
    | "adv-auth"
    | "adv-concluir"
    | "cert-criar"
    | "cert-concluir",
  userId: string,
  ip: string | null | undefined
): string {
  return `gd-ipecc:${kind}:${userId}:${ip || "sem-ip"}`;
}

export function validarPublicoRateKey(ip: string | null | undefined): string {
  return `gd-validar:${ip || "sem-ip"}`;
}

export function mensagemRateLimit(retryAfterSec?: number): string {
  if (retryAfterSec && retryAfterSec > 0) {
    return `Muitas tentativas. Aguarde ${retryAfterSec}s.`;
  }
  return "Muitas tentativas. Aguarde um minuto.";
}
