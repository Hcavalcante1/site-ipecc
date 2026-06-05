import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { revalidateForTable } from "@/lib/admin/revalidateTables";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_TABLES = new Set([
  "noticias",
  "eventos",
  "paginas_conteudo",
  "paginas_eixos",
  "paginas",
  "editais",
  "editais_documentos",
  "documentos_publicos",
  "editais_logs",
  "transparencia_editais",
  "transparencia_convenios",
  "transparencia_prestacao_contas",
  "certidoes",
  "propostas",
  "proposta_anexos",
  "contato_mensagens",
  "admin_logs",
  "logs_atividade",
]);

const ALLOWED_FILTER_OPERATORS = new Set(["eq"]);
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type Filter = { column: string; value: unknown };

type Body = {
  table: string;
  action: "insert" | "update" | "delete" | "upsert";
  payload?: unknown;
  filters?: Filter[];
  select?: string;
  single?: boolean;
  upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };
};

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
    const body = (await req.json()) as Body;
    const { table, action, payload, filters = [], select, single, upsertOptions } = body;

    // no debug logs

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { ok: false, error: `Tabela não permitida: ${table}` },
        { status: 400 }
      );
    }

    if (!["insert", "update", "delete", "upsert"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Ação inválida" }, { status: 400 });
    }

    if ((action === "update" || action === "delete") && filters.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Filtros sao obrigatorios para update/delete" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabaseAdmin.from(table);

    if (action === "insert") {
      query = query.insert(payload);
    } else if (action === "update") {
      query = query.update(payload);
    } else if (action === "delete") {
      query = query.delete();
    } else if (action === "upsert") {
      if (upsertOptions?.onConflict) {
        query = query.upsert(payload, {
          onConflict: upsertOptions.onConflict,
          ignoreDuplicates: upsertOptions.ignoreDuplicates,
        });
      } else {
        query = query.upsert(payload);
      }
    }

    for (const f of filters) {
      const col = (f as any).column;
      const val = (f as any).value ?? (f as any).val ?? (f as any).v;
      const op = (f as any).operator ?? (f as any).op ?? "eq";

      if (!col) continue;

      if (typeof col !== "string" || !IDENTIFIER_PATTERN.test(col)) {
        return NextResponse.json(
          { ok: false, error: "Filtro invalido" },
          { status: 400 }
        );
      }

      if (!ALLOWED_FILTER_OPERATORS.has(op)) {
        return NextResponse.json(
          { ok: false, error: "Operador de filtro nao permitido" },
          { status: 400 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qAny: any = query;
      if (op && typeof qAny[op] === "function") {
        query = qAny[op](col, val);
      } else {
        query = query.eq(col, val);
      }
    }

    if (select) {
      query = query.select(select);
    } else if (action === "delete") {
      query = query.select("id", { count: "exact" });
    }

    if (single) {
      query = query.single();
    }

    const result = await query;

    // no debug logs

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message, data: null },
        { status: 500 }
      );
    }

    if (action === "delete") {
      const deletedCount = Array.isArray(result.data)
        ? result.data.length
        : result.data
        ? 1
        : result.count ?? 0;

      if (deletedCount === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "Nenhum registro foi excluído. Verifique o ID ou os filtros.",
            data: null,
          },
          { status: 404 }
        );
      }
    }

    revalidateForTable(table);

    return NextResponse.json({
      ok: true,
      data: result.data,
      count: result.count ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro na mutação admin";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
