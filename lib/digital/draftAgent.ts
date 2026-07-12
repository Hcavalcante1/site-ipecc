import { PROJETOS_DESTAQUE } from "@/lib/landing/content";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  draftFromEvento,
  draftFromNoticia,
  draftFromProjeto,
} from "./templates";
import type { DigitalDraftInput } from "./types";

export type DraftAgentResult = {
  generated: number;
  skipped: number;
  drafts: DigitalDraftInput[];
  errors: string[];
};

type GenerateOptions = {
  limitNoticias?: number;
  limitEventos?: number;
  includeProjetos?: boolean;
  /** Se false, só monta drafts sem gravar. */
  persist?: boolean;
  createdBy?: string | null;
};

async function alreadyExists(
  supabase: SupabaseClient,
  sourceType: string,
  sourceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("digital_posts")
    .select("id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

/**
 * Agent Fase 1: gera rascunhos a partir de notícias, eventos e programas do site.
 * Sem chamada a APIs de redes sociais.
 */
export async function generateDigitalDrafts(
  supabase: SupabaseClient,
  options: GenerateOptions = {}
): Promise<DraftAgentResult> {
  const limitNoticias = options.limitNoticias ?? 5;
  const limitEventos = options.limitEventos ?? 5;
  const includeProjetos = options.includeProjetos !== false;
  const persist = options.persist !== false;

  const drafts: DigitalDraftInput[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let generated = 0;

  const { data: noticias, error: errNoticias } = await supabase
    .from("noticias")
    .select("id, titulo, resumo, publicado")
    .eq("publicado", true)
    .order("created_at", { ascending: false })
    .limit(limitNoticias);

  if (errNoticias) {
    errors.push(`noticias: ${errNoticias.message}`);
  } else {
    for (const n of noticias ?? []) {
      if (!n?.id || !n.titulo) continue;
      if (persist && (await alreadyExists(supabase, "agent_noticia", n.id))) {
        skipped++;
        continue;
      }
      drafts.push(
        draftFromNoticia({
          id: n.id,
          titulo: n.titulo,
          resumo: n.resumo,
        })
      );
    }
  }

  const { data: eventos, error: errEventos } = await supabase
    .from("eventos")
    .select("id, titulo, data_evento, local, publicado")
    .eq("publicado", true)
    .order("data_evento", { ascending: true })
    .limit(limitEventos);

  if (errEventos) {
    // alguns ambientes usam status em vez de publicado
    const fallback = await supabase
      .from("eventos")
      .select("id, titulo, data_evento, local")
      .order("data_evento", { ascending: true })
      .limit(limitEventos);
    if (fallback.error) {
      errors.push(`eventos: ${errEventos.message}`);
    } else {
      for (const e of fallback.data ?? []) {
        if (!e?.id || !e.titulo) continue;
        if (persist && (await alreadyExists(supabase, "agent_evento", e.id))) {
          skipped++;
          continue;
        }
        drafts.push(
          draftFromEvento({
            id: e.id,
            titulo: e.titulo,
            data_evento: e.data_evento,
            local: e.local,
          })
        );
      }
    }
  } else {
    for (const e of eventos ?? []) {
      if (!e?.id || !e.titulo) continue;
      if (persist && (await alreadyExists(supabase, "agent_evento", e.id))) {
        skipped++;
        continue;
      }
      drafts.push(
        draftFromEvento({
          id: e.id,
          titulo: e.titulo,
          data_evento: e.data_evento,
          local: (e as { local?: string | null }).local,
        })
      );
    }
  }

  if (includeProjetos) {
    for (const p of PROJETOS_DESTAQUE) {
      if (persist && (await alreadyExists(supabase, "agent_projeto", p.slug))) {
        skipped++;
        continue;
      }
      drafts.push(
        draftFromProjeto({
          slug: p.slug,
          titulo: p.titulo,
          texto: p.texto,
          href: p.href,
        })
      );
    }
  }

  if (!persist) {
    return { generated: drafts.length, skipped, drafts, errors };
  }

  const { data: siteAccounts } = await supabase
    .from("digital_accounts")
    .select("id")
    .eq("scope", "site")
    .eq("ativo", true);

  const accountIds = (siteAccounts ?? []).map((a) => a.id as string);

  for (const d of drafts) {
    const { data: inserted, error } = await supabase
      .from("digital_posts")
      .insert({
        title: d.title,
        body: d.body,
        hashtags: d.hashtags,
        media_url: d.media_url ?? null,
        source_type: d.source_type,
        source_id: d.source_id,
        status: "draft",
        created_by: options.createdBy ?? "digital-agent",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      if (error?.message?.includes("digital_posts_source_uidx")) {
        skipped++;
        continue;
      }
      errors.push(`${d.source_type}/${d.source_id}: ${error?.message ?? "insert"}`);
      continue;
    }

    generated++;

    if (accountIds.length > 0) {
      const targets = accountIds.map((account_id) => ({
        post_id: inserted.id,
        account_id,
      }));
      const { error: tErr } = await supabase
        .from("digital_post_targets")
        .insert(targets);
      if (tErr) {
        errors.push(`targets ${inserted.id}: ${tErr.message}`);
      }
    }
  }

  return { generated, skipped, drafts, errors };
}
