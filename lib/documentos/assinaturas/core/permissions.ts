import type { SignatureLevel } from "./types";

/** Regras mínimas de autorização compartilhadas (server-side). */
export function podeUsarNivelAssinatura(opts: {
  level: SignatureLevel;
  identityVerified: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (opts.level === "ADVANCED" && !opts.identityVerified) {
    return {
      ok: false,
      reason:
        "Assinatura avançada exige identidade habilitada (verificada) do signatário.",
    };
  }
  return { ok: true };
}

/** Administrador não conclui assinatura avançada em nome de terceiro. */
export function proibirAssinaturaPorTerceiro(opts: {
  level: SignatureLevel;
  actorUserId: string;
  signerUserId: string;
}): { ok: true } | { ok: false; reason: string } {
  if (
    opts.level === "ADVANCED" &&
    opts.actorUserId !== opts.signerUserId
  ) {
    return {
      ok: false,
      reason:
        "Na assinatura avançada, apenas o próprio signatário pode autorizar a operação.",
    };
  }
  return { ok: true };
}
