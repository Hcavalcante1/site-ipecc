import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CONSENTIMENTO_ASSINATURA_IPECC,
  IPECC_PROVIDER_CODE,
  type ClienteAssinaturaMeta,
} from "./constants";
import { criarEEnviarOtp, consumirOtp } from "./otpService";
import { confirmarSenhaUsuario } from "./passwordConfirm";
import { confirmarAssinaturaIpecc } from "./ipeccSignService";
import { criarAssinaturaDocumento } from "../signatureService";

export async function iniciarLoteIpecc(opts: {
  batchId: string;
  userId: string;
  actorEmail: string;
  consentAccepted: boolean;
  client: ClienteAssinaturaMeta;
}): Promise<
  | {
      ok: true;
      challengeId: string;
      consentText: string;
      total: number;
      devCode?: string;
      emailWarning?: string;
    }
  | { ok: false; error: string; status?: number }
> {
  if (!opts.consentAccepted) {
    return {
      ok: false,
      error: "É obrigatório aceitar o termo de assinatura eletrônica.",
      status: 400,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: batch, error } = await admin
    .from("gd_signature_batches")
    .select(
      "id, title, provider_code, status, progress_done, progress_total, processo_id"
    )
    .eq("id", opts.batchId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !batch) {
    return { ok: false, error: "Lote não encontrado.", status: 404 };
  }

  if (batch.provider_code !== IPECC_PROVIDER_CODE) {
    await admin
      .from("gd_signature_batches")
      .update({
        provider_code: IPECC_PROVIDER_CODE,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch.id);
  }

  const { data: items } = await admin
    .from("gd_signature_batch_items")
    .select("id, document_id, signature_document_id, status, sort_order")
    .eq("batch_id", batch.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const pending = (items || []).filter(
    (i) => i.status === "pending" || i.status === "failed"
  );
  if (pending.length === 0) {
    return { ok: false, error: "Lote sem itens pendentes.", status: 400 };
  }

  const email = String(opts.actorEmail || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "E-mail do usuário inválido.", status: 400 };
  }

  await admin
    .from("gd_signature_batches")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", batch.id);

  await admin.from("gd_signature_events").insert({
    batch_id: batch.id,
    event_type: "batch_consent_accepted",
    payload: {
      consent_text: CONSENTIMENTO_ASSINATURA_IPECC,
      total: pending.length,
    },
    ip: opts.client.ip || null,
    user_agent: opts.client.userAgent || null,
    created_by: opts.userId,
  });

  const otp = await criarEEnviarOtp({
    batchId: batch.id,
    userId: opts.userId,
    email,
    ip: opts.client.ip,
  });

  if (otp.ok === false) {
    return { ok: false, error: otp.error, status: otp.status };
  }

  return {
    ok: true,
    challengeId: otp.challengeId,
    consentText: CONSENTIMENTO_ASSINATURA_IPECC,
    total: pending.length,
    ...(otp.devCode ? { devCode: otp.devCode } : {}),
    ...(otp.emailWarning ? { emailWarning: otp.emailWarning } : {}),
  };
}

export async function confirmarLoteIpecc(opts: {
  batchId: string;
  userId: string;
  actorEmail: string;
  actorName?: string | null;
  password: string;
  otpCode: string;
  challengeId: string;
  consentAccepted: boolean;
  cpf?: string | null;
  cargo?: string | null;
  client: ClienteAssinaturaMeta;
}): Promise<
  | {
      ok: true;
      progressDone: number;
      progressTotal: number;
      falhas: Array<{ documentId: string; error: string }>;
    }
  | { ok: false; error: string; status?: number }
> {
  if (!opts.consentAccepted) {
    return {
      ok: false,
      error: "É obrigatório aceitar o termo de assinatura eletrônica.",
      status: 400,
    };
  }

  const email = String(opts.actorEmail || "")
    .trim()
    .toLowerCase();
  const senha = await confirmarSenhaUsuario({
    email,
    password: opts.password,
  });
  if (senha.ok === false) {
    return { ok: false, error: senha.error, status: 401 };
  }

  const otp = await consumirOtp({
    challengeId: opts.challengeId,
    code: opts.otpCode,
    userId: opts.userId,
  });
  if (otp.ok === false) {
    return { ok: false, error: otp.error, status: otp.status };
  }

  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_signature_batches")
    .select("id, processo_id, progress_done, progress_total, title")
    .eq("id", opts.batchId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!batch) {
    return { ok: false, error: "Lote não encontrado.", status: 404 };
  }

  const { data: items } = await admin
    .from("gd_signature_batch_items")
    .select("id, document_id, signature_document_id, status, sort_order")
    .eq("batch_id", batch.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const pending = (items || []).filter(
    (i) => i.status === "pending" || i.status === "failed"
  );

  await admin
    .from("gd_signature_batches")
    .update({
      status: "running",
      progress_total: (items || []).length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  const falhas: Array<{ documentId: string; error: string }> = [];
  let done = Number(batch.progress_done || 0);

  for (const item of pending) {
    await admin
      .from("gd_signature_batch_items")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    try {
      let sigId = item.signature_document_id as string | null;
      if (!sigId) {
        const created = await criarAssinaturaDocumento({
          documentId: item.document_id,
          userId: opts.userId,
          actorEmail: email,
          processoId: batch.processo_id,
          ip: opts.client.ip,
          userAgent: opts.client.userAgent,
          providerCode: IPECC_PROVIDER_CODE,
          modo: "eu_assino",
          distribute: false,
        });
        if (created.error || !created.data) {
          const msg =
            typeof created.error === "object" &&
            created.error &&
            "message" in created.error
              ? String((created.error as { message?: string }).message)
              : "Falha ao criar pedido de assinatura.";
          throw new Error(msg);
        }
        sigId = created.data.id;
        await admin
          .from("gd_signature_batch_items")
          .update({
            signature_document_id: sigId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }

      const signed = await confirmarAssinaturaIpecc({
        signatureDocumentId: sigId,
        userId: opts.userId,
        actorEmail: email,
        actorName: opts.actorName,
        password: opts.password,
        otpCode: opts.otpCode,
        challengeId: opts.challengeId,
        consentAccepted: true,
        cpf: opts.cpf,
        cargo: opts.cargo,
        client: opts.client,
        skipAuth: true,
      });

      if (signed.ok === false) {
        throw new Error(signed.error);
      }

      await admin
        .from("gd_signature_batch_items")
        .update({
          status: "signed",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      done += 1;
      await admin
        .from("gd_signature_batches")
        .update({
          progress_done: done,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao assinar item.";
      falhas.push({ documentId: item.document_id, error: msg });
      await admin
        .from("gd_signature_batch_items")
        .update({
          status: "failed",
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
  }

  const total = (items || []).length;
  const finalStatus = done === 0 ? "failed" : "completed";

  await admin
    .from("gd_signature_batches")
    .update({
      status: finalStatus,
      progress_done: done,
      progress_total: total,
      error_message:
        falhas.length > 0 ? `${falhas.length} item(ns) com falha.` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  return {
    ok: true,
    progressDone: done,
    progressTotal: total,
    falhas,
  };
}
