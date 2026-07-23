import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const NOTIF_SELECT =
  "id, processo_id, document_id, batch_id, user_id, email, channel, event_type, title, body, link_path, read_at, sent_at, created_by, created_at, updated_at, deleted_at";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export { tabelaAusente as tabelaNotificacaoAusente };

export type NotificarInput = {
  event_type: string;
  title: string;
  body?: string | null;
  document_id?: string | null;
  batch_id?: string | null;
  processo_id?: string | null;
  user_id?: string | null;
  email?: string | null;
  channel?: "in_app" | "email";
  link_path?: string | null;
  created_by?: string | null;
};

/** Cria notificação in-app (e marca e-mail como fila se channel=email). */
export async function notificarEventoDocumental(input: NotificarInput) {
  const admin = getSupabaseAdmin();
  const channel = input.channel || "in_app";
  const { data, error } = await admin
    .from("gd_notifications")
    .insert({
      processo_id: input.processo_id || null,
      document_id: input.document_id || null,
      batch_id: input.batch_id || null,
      user_id: input.user_id || null,
      email: input.email || null,
      channel,
      event_type: input.event_type,
      title: input.title,
      body: input.body || null,
      link_path: input.link_path || null,
      sent_at: channel === "in_app" ? new Date().toISOString() : null,
      created_by: input.created_by || null,
    })
    .select(NOTIF_SELECT)
    .maybeSingle();

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      console.warn(
        "gd_notifications ausente — aplique docs/sql/gestao-documental-fase-4-6.sql"
      );
      return { data: null, error: null, skipped: true as const };
    }
    console.warn("Falha ao notificar:", error.message);
    return { data: null, error, skipped: false as const };
  }
  return { data, error: null, skipped: false as const };
}

export async function listarNotificacoes(opts: {
  userId?: string | null;
  processoIds?: string[] | "todos";
  apenasNaoLidas?: boolean;
  limit?: number;
}) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("gd_notifications")
    .select(NOTIF_SELECT)
    .is("deleted_at", null)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  }
  if (opts.apenasNaoLidas) {
    query = query.is("read_at", null);
  }
  if (opts.processoIds && opts.processoIds !== "todos" && opts.processoIds.length) {
    query = query.in("processo_id", opts.processoIds);
  }

  return query;
}

export async function marcarTodasNotificacoesLidas(
  userId: string,
  processoIds: string[] | "todos"
) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  let query = admin
    .from("gd_notifications")
    .update({ read_at: now, updated_at: now })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("read_at", null);

  if (processoIds !== "todos") {
    if (processoIds.length === 0) return { data: null, error: null };
    query = query.in("processo_id", processoIds);
  }

  return query;
}

export async function marcarNotificacaoLida(id: string, userId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(NOTIF_SELECT)
    .maybeSingle();
}
