import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  upsertPaginaConteudoDb,
  upsertPaginaConteudoBatchDb,
  type PaginaConteudoUpsert,
} from "@/lib/cms/paginasConteudo";
import { revalidatePaginaPublica } from "@/lib/cms/revalidatePaginas";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY ausente no servidor. Adicione em .env.local e reinicie npm run dev.",
      },
      { status: 500 }
    );
  }

  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const rows = (Array.isArray(body?.rows) ? body.rows : body?.row ? [body.row] : []) as PaginaConteudoUpsert[];

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "Payload vazio" }, { status: 400 });
    }

    for (const row of rows) {
      if (!row.pagina_slug || !row.bloco) {
        return NextResponse.json(
          { ok: false, error: "pagina_slug e bloco são obrigatórios" },
          { status: 400 }
        );
      }
    }

    const result =
      rows.length === 1
        ? await upsertPaginaConteudoDb(supabaseAdmin, rows[0])
        : await upsertPaginaConteudoBatchDb(supabaseAdmin, rows);

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message },
        { status: 500 }
      );
    }

    const slugs = new Set(rows.map((r) => r.pagina_slug));
    for (const slug of slugs) {
      revalidatePaginaPublica(slug);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao salvar CMS";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
