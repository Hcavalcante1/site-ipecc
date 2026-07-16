/**
 * Rate limit em memória (janela deslizante simples) para rotas IPECC.
 * Espelha o padrão de app/api/public/whatsapp-lead/route.ts.
 */

type HitEntry = { count: number; resetAt: number };

const hits = new Map<string, HitEntry>();

const DEFAULT_WINDOW_MS = 60_000;

export const RATE_ASSINATURA = { windowMs: DEFAULT_WINDOW_MS, max: 20 } as const;
export const RATE_OTP = { windowMs: DEFAULT_WINDOW_MS, max: 8 } as const;
export const RATE_VALIDAR_PUBLICO = { windowMs: DEFAULT_WINDOW_MS, max: 30 } as const;

export function checkRateLimit(
  key: string,
  opts?: { windowMs?: number; max?: number }
): { limited: boolean; retryAfterSec: number } {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts?.max ?? 10;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
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
