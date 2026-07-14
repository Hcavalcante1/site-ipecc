import { createHash, randomInt } from "crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { otpPepper } from "./constants";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashOtp(code: string): string {
  return createHash("sha256")
    .update(`${otpPepper()}:${code}`)
    .digest("hex");
}

function gerarCodigo6(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function enviarEmailOtp(opts: {
  to: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error:
          "E-mail OTP não configurado. Defina RESEND_API_KEY no servidor.",
      };
    }
    console.info(
      `[assinatura-ipecc] OTP (dev sem RESEND_API_KEY) para ${opts.to}: ${opts.code}`
    );
    return { ok: true };
  }

  const from =
    String(process.env.EMAIL_ADMIN || "").trim() ||
    String(process.env.EMAIL_CONTATO || "").trim() ||
    "noreply@ipecc.org.br";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: "[IPECC] Código de assinatura eletrônica",
      text: [
        "Você solicitou assinar eletronicamente um documento no IPECC.",
        "",
        `Código: ${opts.code}`,
        "",
        "Validade: 10 minutos. Se não foi você, ignore este e-mail.",
      ].join("\n"),
    });
    if (error) {
      return {
        ok: false,
        error:
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao enviar e-mail OTP.",
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar e-mail OTP.",
    };
  }
}

export async function criarEEnviarOtp(opts: {
  signatureDocumentId?: string | null;
  batchId?: string | null;
  userId: string;
  email: string;
  ip?: string | null;
}): Promise<
  | {
      ok: true;
      challengeId: string;
      /** Somente em desenvolvimento sem Resend. */
      devCode?: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const email = String(opts.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail do signatário inválido.", status: 400 };
  }
  if (!opts.signatureDocumentId && !opts.batchId) {
    return {
      ok: false,
      error: "Informe signatureDocumentId ou batchId.",
      status: 400,
    };
  }

  const recentQ = admin
    .from("gd_signature_otp_challenges")
    .select("id, created_at")
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const recent = opts.signatureDocumentId
    ? await recentQ.eq("signature_document_id", opts.signatureDocumentId)
    : await recentQ.eq("batch_id", opts.batchId!);

  const last = recent.data?.[0];
  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: `Aguarde ${Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)}s para reenviar o código.`,
        status: 429,
      };
    }
  }

  const code = gerarCodigo6();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { data, error } = await admin
    .from("gd_signature_otp_challenges")
    .insert({
      signature_document_id: opts.signatureDocumentId || null,
      batch_id: opts.batchId || null,
      user_id: opts.userId,
      email,
      code_hash: hashOtp(code),
      expires_at: expiresAt,
      ip: opts.ip || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (/relation .* does not exist|42P01/i.test(error?.message || "")) {
      return {
        ok: false,
        error:
          "Tabelas de assinatura IPECC ausentes. Aplique docs/sql/gestao-documental-assinatura-ipecc.sql.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: error?.message || "Falha ao criar desafio OTP.",
      status: 500,
    };
  }

  const mail = await enviarEmailOtp({ to: email, code });
  if (!mail.ok) {
    return { ok: false, error: mail.error || "Falha no e-mail OTP.", status: 502 };
  }

  const devEcho =
    !String(process.env.RESEND_API_KEY || "").trim() &&
    process.env.NODE_ENV !== "production";

  return {
    ok: true,
    challengeId: data.id,
    ...(devEcho ? { devCode: code } : {}),
  };
}

export async function consumirOtp(opts: {
  challengeId: string;
  code: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const admin = getSupabaseAdmin();
  const code = String(opts.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Código OTP inválido.", status: 400 };
  }

  const { data: row, error } = await admin
    .from("gd_signature_otp_challenges")
    .select(
      "id, user_id, code_hash, expires_at, consumed_at, attempts, max_attempts"
    )
    .eq("id", opts.challengeId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Desafio OTP não encontrado.", status: 404 };
  }
  if (row.user_id !== opts.userId) {
    return { ok: false, error: "Desafio OTP não pertence ao usuário.", status: 403 };
  }
  if (row.consumed_at) {
    return { ok: false, error: "Código OTP já utilizado.", status: 400 };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Código OTP expirado.", status: 400 };
  }
  if (row.attempts >= row.max_attempts) {
    return {
      ok: false,
      error: "Número máximo de tentativas OTP excedido.",
      status: 429,
    };
  }

  const match = row.code_hash === hashOtp(code);
  await admin
    .from("gd_signature_otp_challenges")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id);

  if (!match) {
    return { ok: false, error: "Código OTP incorreto.", status: 400 };
  }

  const { error: consumeErr } = await admin
    .from("gd_signature_otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null);

  if (consumeErr) {
    return { ok: false, error: consumeErr.message, status: 500 };
  }

  return { ok: true };
}
