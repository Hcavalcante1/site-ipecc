import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type EmailConfig = {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  email_destino?: string;
};

async function getEmailConfig(): Promise<EmailConfig> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("email_config").select("chave, valor");
  const cfg: EmailConfig = {};
  for (const row of (data ?? []) as { chave: string; valor: string }[]) {
    cfg[row.chave as keyof EmailConfig] = row.valor;
  }
  return cfg;
}

export async function emailEstaConfigurado(): Promise<boolean> {
  const cfg = await getEmailConfig();
  return Boolean(cfg.smtp_user && cfg.smtp_pass);
}

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getEmailConfig();
  if (!cfg.smtp_user || !cfg.smtp_pass) {
    return { ok: false, error: "E-mail SMTP não configurado (tabela email_config)." };
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.smtp_host || "smtp.zoho.com",
      port: Number(cfg.smtp_port || 465),
      secure: (cfg.smtp_port || "465") === "465",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    await transport.sendMail({
      from: opts.from || cfg.smtp_user,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar e-mail." };
  }
}
