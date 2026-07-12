import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import {
  DIGITAL_PLATFORMS,
  isDigitalPlatform,
  type DigitalAccountScope,
} from "@/lib/digital/types";

export async function GET() {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, scope, projeto_ref, ativo, created_at, updated_at, automation_enabled, automation_strategy, connection_status, requires_reconnect, last_connection_error, last_connected_at"
    )
    .order("scope", { ascending: true })
    .order("platform", { ascending: true });

  if (error) {
    const missingCol =
      /automation_|connection_|column .* does not exist/i.test(error.message || "");
    if (missingCol) {
      const fallback = await supabaseAdmin
        .from("digital_accounts")
        .select(
          "id, platform, label, href, handle, scope, projeto_ref, ativo, created_at, updated_at"
        )
        .order("scope", { ascending: true })
        .order("platform", { ascending: true });
      if (!fallback.error) {
        return NextResponse.json({
          ok: true,
          accounts: fallback.data ?? [],
          aviso:
            "Colunas de automação ausentes. Aplique docs/sql/digital-redes-automation-phase1.sql.",
        });
      }
    }
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
  const { denied } = await denyIfSemModuloDigital();
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
        error: `Rede inválida. Use: ${DIGITAL_PLATFORMS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const label = body.label?.trim();
  const href = body.href?.trim();
  if (!label || !href) {
    return NextResponse.json(
      { ok: false, error: "Rótulo e endereço (URL) são obrigatórios" },
      { status: 400 }
    );
  }

  const scope: DigitalAccountScope =
    body.scope === "projeto" ? "projeto" : "site";
  const projeto_ref =
    scope === "projeto" ? (body.projeto_ref?.trim() || null) : null;

  if (scope === "projeto" && !projeto_ref) {
    return NextResponse.json(
      {
        ok: false,
        error: "Referência do projeto é obrigatória quando o escopo é por projeto",
      },
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
  const { denied } = await denyIfSemModuloDigital();
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
    return NextResponse.json({ ok: false, error: "Identificador obrigatório" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json(
        { ok: false, error: "Rótulo não pode ficar vazio" },
        { status: 400 }
      );
    }
    patch.label = label;
  }
  if (body.href !== undefined) {
    const href = body.href.trim();
    if (!href) {
      return NextResponse.json(
        { ok: false, error: "Endereço (URL) não pode ficar vazio" },
        { status: 400 }
      );
    }
    patch.href = href;
  }
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
