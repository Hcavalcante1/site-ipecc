/**
 * Publicação de imagem + legenda no Instagram via Graph API.
 * Requer conta profissional e permissão instagram_content_publish.
 */

export type InstagramPublishInput = {
  caption: string;
  imageUrl: string;
};

export type InstagramPublishResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: string };

function graphConfig():
  | { ok: true; token: string; igUserId: string; version: string }
  | { ok: false; error: string } {
  const token = process.env.META_GRAPH_ACCESS_TOKEN?.trim();
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  const version = (
    process.env.META_GRAPH_API_VERSION?.trim() || "v21.0"
  ).replace(/^\/+|\/+$/g, "");

  if (!token || !igUserId) {
    return {
      ok: false,
      error:
        "Publicação no Instagram não configurada. Defina META_GRAPH_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID no servidor (Vercel).",
    };
  }

  return { ok: true, token, igUserId, version };
}

async function graphPost(
  url: string,
  body: Record<string, string>
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao chamar a Graph API do Instagram.",
    };
  }

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      error: `Resposta inválida da Graph API (HTTP ${res.status}).`,
    };
  }

  if (!res.ok) {
    const errObj = json.error as { message?: string } | undefined;
    const msg =
      errObj?.message ||
      (typeof json.error === "string" ? json.error : null) ||
      `Erro HTTP ${res.status} na Graph API.`;
    return { ok: false, error: msg };
  }

  return { ok: true, json };
}

/** Cria container de mídia e publica no feed. */
export async function publishInstagramImagePost(
  input: InstagramPublishInput
): Promise<InstagramPublishResult> {
  const cfg = graphConfig();
  if (cfg.ok === false) {
    return { ok: false, error: cfg.error };
  }

  const caption = input.caption.trim().slice(0, 2200);
  const imageUrl = input.imageUrl.trim();
  if (!/^https?:\/\//i.test(imageUrl)) {
    return {
      ok: false,
      error:
        "A URL da imagem precisa ser pública (http/https). A API do Instagram não aceita post só com texto.",
    };
  }

  const base = `https://graph.facebook.com/${cfg.version}/${cfg.igUserId}`;

  const created = await graphPost(`${base}/media`, {
    image_url: imageUrl,
    caption,
    access_token: cfg.token,
  });
  if (created.ok === false) {
    return { ok: false, error: created.error };
  }

  const creationId = created.json.id;
  if (typeof creationId !== "string" || !creationId) {
    return {
      ok: false,
      error: "A Graph API não retornou o identificador do container de mídia.",
    };
  }

  const published = await graphPost(`${base}/media_publish`, {
    creation_id: creationId,
    access_token: cfg.token,
  });
  if (published.ok === false) {
    return { ok: false, error: published.error };
  }

  const mediaId = published.json.id;
  if (typeof mediaId !== "string" || !mediaId) {
    return {
      ok: false,
      error: "A Graph API não retornou o identificador do post publicado.",
    };
  }

  return { ok: true, mediaId };
}

export function instagramCredenciaisConfiguradas(): boolean {
  return Boolean(
    process.env.META_GRAPH_ACCESS_TOKEN?.trim() &&
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim()
  );
}
