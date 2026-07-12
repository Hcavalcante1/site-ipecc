import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isDigitalPostStatus } from "@/lib/digital/types";

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

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status")?.trim();

  let query = supabaseAdmin
    .from("digital_posts")
    .select(
      "id, title, body, hashtags, media_url, source_type, source_id, status, scheduled_at, published_at, created_by, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && isDigitalPostStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    const missing =
      error.message.includes("digital_posts") || error.code === "42P01";
    return NextResponse.json({
      ok: true,
      posts: [],
      aviso: missing
        ? "Tabela digital_posts ausente. Aplique docs/sql/digital-redes-fase1.sql no Supabase."
        : error.message,
    });
  }

  return NextResponse.json({ ok: true, posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  let body: {
    title?: string;
    body?: string;
    hashtags?: string | null;
    media_url?: string | null;
    account_ids?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json(
      { ok: false, error: "title e body são obrigatórios" },
      { status: 400 }
    );
  }

  const createdBy = auth.contexto.email ?? auth.contexto.userId;

  const { data, error } = await supabaseAdmin
    .from("digital_posts")
    .insert({
      title,
      body: text,
      hashtags: body.hashtags?.trim() || null,
      media_url: body.media_url?.trim() || null,
      source_type: "manual",
      status: "draft",
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, title, body, hashtags, media_url, source_type, source_id, status, scheduled_at, published_at, created_by, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const accountIds = Array.isArray(body.account_ids)
    ? body.account_ids.filter(Boolean)
    : [];

  if (data?.id && accountIds.length > 0) {
    await supabaseAdmin.from("digital_post_targets").insert(
      accountIds.map((account_id) => ({
        post_id: data.id,
        account_id,
      }))
    );
  }

  return NextResponse.json({ ok: true, post: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  let body: {
    id?: string;
    title?: string;
    body?: string;
    hashtags?: string | null;
    media_url?: string | null;
    status?: string;
    scheduled_at?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.body !== undefined) patch.body = body.body.trim();
  if (body.hashtags !== undefined) {
    patch.hashtags =
      body.hashtags === null || body.hashtags === ""
        ? null
        : String(body.hashtags).trim();
  }
  if (body.media_url !== undefined) {
    patch.media_url =
      body.media_url === null || body.media_url === ""
        ? null
        : String(body.media_url).trim();
  }
  if (body.status !== undefined) {
    if (!isDigitalPostStatus(body.status)) {
      return NextResponse.json(
        { ok: false, error: "status inválido" },
        { status: 400 }
      );
    }
    patch.status = body.status;
    if (body.status === "published_manual") {
      patch.published_at = new Date().toISOString();
    }
  }
  if (body.scheduled_at !== undefined) {
    patch.scheduled_at = body.scheduled_at || null;
  }

  const { data, error } = await supabaseAdmin
    .from("digital_posts")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, body, hashtags, media_url, source_type, source_id, status, scheduled_at, published_at, created_by, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, post: data });
}
