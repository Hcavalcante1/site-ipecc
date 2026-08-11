import { createHash, randomInt } from "crypto";
import { enviarEmail } from "@/lib/email/mailer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { otpPepper, otpPermitirCodigoNoPainel } from "./constants";

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
  const result = await enviarEmail({
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
  if (!result.ok) {
    console.info(
      `[assinatura-ipecc] OTP (e-mail indisponível: ${result.error}) para ${opts.to}: ${opts.code}`
    );
  }
  return result;
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
      /**
       * Código ecoado no painel admin quando o e-mail falha ou o
       * SMTP (tabela email_config) não está configurado.
       */
      devCode?: string;
      emailWarning?: string;
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
    if (!otpPermitirCodigoNoPainel()) {
      console.warn(
        `[assinatura-ipecc] e-mail OTP falhou (${mail.error}); fallback no painel desabilitado`
      );
      return {
        ok: false,
        error:
          "Não foi possível enviar o código OTP por e-mail. Configure o SMTP (tabela email_config) ou defina SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true (apenas se aceitar o risco operacional).",
        status: 503,
      };
    }
    // Contingência: ecoa o OTP no painel admin autenticado.
    console.warn(
      `[assinatura-ipecc] e-mail OTP falhou (${mail.error}); código ecoado no admin para ${email}`
    );
    return {
      ok: true,
      challengeId: data.id,
      devCode: code,
      emailWarning:
        mail.error ||
        "Não foi possível enviar o e-mail. Use o código exibido neste painel.",
    };
  }

  return {
    ok: true,
    challengeId: data.id,
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
