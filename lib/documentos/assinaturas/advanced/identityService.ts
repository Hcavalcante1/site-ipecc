import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { otpPepper } from "@/lib/documentos/signing/constants";
import { cpfLast4, hashCpf } from "../shared/crypto";
import type { IdentityLevel, IdentityVerificationStatus } from "../core/types";

export type AdvIdentityRow = {
  id: string;
  user_id: string;
  processo_id: string | null;
  full_name: string;
  cpf_hash: string;
  cpf_last4: string | null;
  email: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  cargo: string | null;
  organization_label: string | null;
  identity_level: IdentityLevel;
  status: IdentityVerificationStatus;
  verification_method: string | null;
  verified_by: string | null;
  verified_at: string | null;
  valid_until: string | null;
  evidence: Record<string, unknown>;
  trust_notes: string | null;
  created_at: string;
  updated_at: string;
};

const ID_SELECT =
  "id, user_id, processo_id, full_name, cpf_hash, cpf_last4, email, email_verified, phone, phone_verified, cargo, organization_label, identity_level, status, verification_method, verified_by, verified_at, valid_until, evidence, trust_notes, created_at, updated_at";

export async function obterIdentidadeAvancada(opts: {
  userId: string;
  processoId?: string | null;
}): Promise<AdvIdentityRow | null> {
  const admin = getSupabaseAdmin();

  // 1) Identidade do processo (se informado)
  if (opts.processoId) {
    const { data: scoped } = await admin
      .from("gd_adv_identity_verifications")
      .select(ID_SELECT)
      .eq("user_id", opts.userId)
      .eq("processo_id", opts.processoId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (scoped) return scoped as AdvIdentityRow;
  }

  // 2) Identidade global (processo_id nulo) — usada pelo modal ao habilitar
  const { data: global } = await admin
    .from("gd_adv_identity_verifications")
    .select(ID_SELECT)
    .eq("user_id", opts.userId)
    .is("processo_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (global) return global as AdvIdentityRow;

  // 3) Qualquer habilitação recente do usuário (evita falso "não habilitada"
  //    quando a UI salvou global e a TX busca por processo)
  const { data: anyRow } = await admin
    .from("gd_adv_identity_verifications")
    .select(ID_SELECT)
    .eq("user_id", opts.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (anyRow as AdvIdentityRow | null) || null;
}

export function identidadePodeAssinarAvancado(
  row: AdvIdentityRow | null
): { ok: true; row: AdvIdentityRow } | { ok: false; reason: string } {
  if (!row) {
    return {
      ok: false,
      reason:
        "Identidade não habilitada para assinatura avançada. Solicite verificação ao administrador.",
    };
  }
  if (row.status === "SUSPENDED") {
    return { ok: false, reason: "Identidade suspensa. Não é possível assinar." };
  }
  if (row.status === "REVOKED") {
    return { ok: false, reason: "Identidade revogada. Não é possível assinar." };
  }
  if (row.status === "EXPIRED") {
    return { ok: false, reason: "Habilitação de identidade expirada." };
  }
  if (row.status !== "VERIFIED") {
    return {
      ok: false,
      reason: "Identidade ainda não está verificada para assinatura avançada.",
    };
  }
  if (row.valid_until && new Date(row.valid_until).getTime() < Date.now()) {
    return { ok: false, reason: "Habilitação de identidade expirada." };
  }
  if (!row.email_verified) {
    return { ok: false, reason: "E-mail da identidade ainda não verificado." };
  }
  return { ok: true, row };
}

export async function upsertIdentidadeAvancada(opts: {
  userId: string;
  processoId?: string | null;
  fullName: string;
  cpf: string;
  email: string;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  cargo?: string | null;
  organizationLabel?: string | null;
  identityLevel?: IdentityLevel;
  status?: IdentityVerificationStatus;
  verificationMethod?: string | null;
  verifiedBy?: string | null;
  validUntil?: string | null;
  trustNotes?: string | null;
  evidence?: Record<string, unknown>;
}): Promise<
  { ok: true; row: AdvIdentityRow } | { ok: false; error: string; status?: number }
> {
  const pepper = otpPepper();
  const cpfDigits = String(opts.cpf || "").replace(/\D/g, "");
  if (cpfDigits.length !== 11) {
    return { ok: false, error: "CPF inválido (11 dígitos).", status: 400 };
  }
  const fullName = String(opts.fullName || "").trim();
  if (fullName.length < 3) {
    return { ok: false, error: "Informe o nome completo.", status: 400 };
  }
  const email = String(opts.email || "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "E-mail inválido.", status: 400 };
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const status = opts.status || "PENDING";
  const payload = {
    user_id: opts.userId,
    processo_id: opts.processoId || null,
    full_name: fullName,
    cpf_hash: hashCpf(cpfDigits, pepper),
    cpf_last4: cpfLast4(cpfDigits),
    email,
    email_verified: Boolean(opts.emailVerified),
    phone: opts.phone || null,
    phone_verified: Boolean(opts.phoneVerified),
    cargo: opts.cargo || null,
    organization_label: opts.organizationLabel || null,
    identity_level: opts.identityLevel || "BASIC",
    status,
    verification_method: opts.verificationMethod || "manual_admin",
    verified_by: status === "VERIFIED" ? opts.verifiedBy || null : null,
    verified_at: status === "VERIFIED" ? now : null,
    valid_until: opts.validUntil || null,
    evidence: opts.evidence || {},
    trust_notes: opts.trustNotes || null,
    updated_at: now,
  };

  const existing = await obterIdentidadeAvancada({
    userId: opts.userId,
    processoId: opts.processoId,
  });

  if (existing) {
    const { data, error } = await admin
      .from("gd_adv_identity_verifications")
      .update(payload)
      .eq("id", existing.id)
      .select(ID_SELECT)
      .single();
    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Falha ao atualizar identidade.",
        status: 500,
      };
    }
    return { ok: true, row: data as AdvIdentityRow };
  }

  const { data, error } = await admin
    .from("gd_adv_identity_verifications")
    .insert({ ...payload, created_at: now })
    .select(ID_SELECT)
    .single();

  if (error || !data) {
    if (/relation .* does not exist|42P01/i.test(error?.message || "")) {
      return {
        ok: false,
        error:
          "Tabelas de assinatura avançada ausentes. Aplique docs/sql/gestao-documental-assinatura-avancada.sql.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: error?.message || "Falha ao criar identidade.",
      status: 500,
    };
  }
  return { ok: true, row: data as AdvIdentityRow };
}
