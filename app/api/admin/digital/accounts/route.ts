import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  DIGITAL_PLATFORMS,
  isDigitalPlatform,
  type DigitalAccountScope,
} from "@/lib/digital/types";

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

export async function GET() {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, scope, projeto_ref, ativo, created_at, updated_at"
    )
    .order("scope", { ascending: true })
    .order("platform", { ascending: true });

  if (error) {
    const missing =
      error.message.includes("digital_accounts") || error.code === "42P01";
    return NextResponse.json({
      ok: true,
      accounts: [],
      aviso: missing
        ? "Tabela digital_accounts ausente. Aplique docs/sql/digital-redes-fase1.sql no Supabase."
        : error.message,
    });
  }

  return NextResponse.json({ ok: true, accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  let body: {
    platform?: string;
    label?: string;
    href?: string;
    handle?: string | null;
    scope?: DigitalAccountScope;
    projeto_ref?: string | null;
    ativo?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const platform = body.platform?.trim() ?? "";
  if (!isDigitalPlatform(platform)) {
    return NextResponse.json(
      {
        ok: false,
        error: `platform inválida. Use: ${DIGITAL_PLATFORMS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const label = body.label?.trim();
  const href = body.href?.trim();
  if (!label || !href) {
    return NextResponse.json(
      { ok: false, error: "label e href são obrigatórios" },
      { status: 400 }
    );
  }

  const scope: DigitalAccountScope =
    body.scope === "projeto" ? "projeto" : "site";
  const projeto_ref =
    scope === "projeto" ? (body.projeto_ref?.trim() || null) : null;

  if (scope === "projeto" && !projeto_ref) {
    return NextResponse.json(
      { ok: false, error: "projeto_ref obrigatório quando scope=projeto" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("digital_accounts")
    .insert({
      platform,
      label,
      href,
      handle: body.handle?.trim() || null,
      scope,
      projeto_ref,
      ativo: body.ativo !== false,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, platform, label, href, handle, scope, projeto_ref, ativo, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, account: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession();
  const denied = denyIfNotMestre(auth);
  if (denied) return denied;

  let body: {
    id?: string;
    label?: string;
    href?: string;
    handle?: string | null;
    scope?: DigitalAccountScope;
    projeto_ref?: string | null;
    ativo?: boolean;
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

  if (body.label !== undefined) patch.label = body.label.trim();
  if (body.href !== undefined) patch.href = body.href.trim();
  if (body.handle !== undefined) {
    patch.handle =
      body.handle === null || body.handle === ""
        ? null
        : String(body.handle).trim();
  }
  if (body.scope !== undefined) {
    patch.scope = body.scope === "projeto" ? "projeto" : "site";
  }
  if (body.projeto_ref !== undefined) {
    patch.projeto_ref =
      body.projeto_ref === null || body.projeto_ref === ""
        ? null
        : String(body.projeto_ref).trim();
  }
  if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo);

  const { data, error } = await supabaseAdmin
    .from("digital_accounts")
    .update(patch)
    .eq("id", id)
    .select(
      "id, platform, label, href, handle, scope, projeto_ref, ativo, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, account: data });
}
