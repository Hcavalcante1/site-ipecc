import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { publishInstagramImagePost } from "@/lib/digital/instagramPublish";

function denyIfNotMestre(auth: Awaited<ReturnType<typeof verifyAdminSession>>) {
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }
  if (!isMestre(auth.contexto)) {
    return NextResponse.json(
      { ok: false, error: "Módulo Digital disponível apenas para mestre nesta fase." },
      { status: 403 }
    );
  }
  return null;
}

function captionDoPost(body: string, hashtags: string | null): string {
  return [body?.trim(), hashtags?.trim()].filter(Boolean).join("\n\n");
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  let body: { post_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const postId = body.post_id?.trim();
  if (!postId) {
    return NextResponse.json(
      { ok: false, error: "Identificador do post obrigatório" },
      { status: 400 }
    );
  }

  const { data: post, error: postError } = await supabaseAdmin
    .from("digital_posts")
    .select(
      "id, title, body, hashtags, media_url, status, external_post_id, published_via"
    )
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    const missingCols =
      postError.message.includes("external_post_id") ||
      postError.message.includes("published_via");
    return NextResponse.json(
      {
        ok: false,
        error: missingCols
          ? "Colunas de publicação ausentes. Aplique docs/sql/digital-redes-instagram-publish.sql no Supabase."
          : postError.message,
      },
      { status: 400 }
    );
  }

  if (!post) {
    return NextResponse.json(
      { ok: false, error: "Post não encontrado" },
      { status: 404 }
    );
  }

  if (post.status !== "approved" && post.status !== "scheduled") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Só é possível publicar no Instagram posts aprovados ou agendados.",
      },
      { status: 400 }
    );
  }

  const mediaUrl = typeof post.media_url === "string" ? post.media_url.trim() : "";
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Informe uma URL pública de imagem (JPG/PNG) em mídia. A API do Instagram não publica só texto.",
      },
      { status: 400 }
    );
  }

  const { data: targets } = await supabaseAdmin
    .from("digital_post_targets")
    .select("account_id, digital_accounts ( platform, ativo )")
    .eq("post_id", postId);

  const temInstagram = (targets ?? []).some((row) => {
    const raw = row.digital_accounts as unknown;
    const acc = Array.isArray(raw) ? raw[0] : raw;
    if (!acc || typeof acc !== "object") return false;
    const a = acc as { platform?: string; ativo?: boolean };
    return a.platform === "instagram" && a.ativo !== false;
  });

  if (!temInstagram) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Este post não tem destino Instagram ativo. Inclua o perfil Instagram nos destinos.",
      },
      { status: 400 }
    );
  }

  const caption = captionDoPost(
    String(post.body ?? ""),
    post.hashtags == null ? null : String(post.hashtags)
  );

  const result = await publishInstagramImagePost({
    caption,
    imageUrl: mediaUrl,
  });

  const now = new Date().toISOString();

  if (result.ok === false) {
    const errMsg = result.error;
    await supabaseAdmin
      .from("digital_posts")
      .update({
        publish_error: errMsg,
        updated_at: now,
      })
      .eq("id", postId);

    const status =
      errMsg.includes("não configurada") || errMsg.includes("Defina META_GRAPH")
        ? 503
        : 400;

    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }

  const mediaId = result.mediaId;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("digital_posts")
    .update({
      status: "published_manual",
      published_at: now,
      published_via: "instagram_api",
      external_post_id: mediaId,
      publish_error: null,
      updated_at: now,
    })
    .eq("id", postId)
    .select(
      "id, title, body, hashtags, media_url, source_type, source_id, status, scheduled_at, published_at, created_by, created_at, updated_at, external_post_id, publish_error, published_via"
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          updateError.message.includes("published_via") ||
          updateError.message.includes("external_post_id")
            ? "Post publicado no Instagram, mas falhou ao gravar no banco. Aplique docs/sql/digital-redes-instagram-publish.sql."
            : updateError.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    post: updated,
    media_id: mediaId,
    aviso: "Publicado no Instagram com sucesso.",
  });
}
