import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  isMestre,
  podeAcessarProcesso,
  type AdminContexto,
} from "@/lib/auth/adminEscopo";
import { revalidateForTable } from "@/lib/admin/revalidateTables";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isEditalFaseRascunho,
  MSG_EXCLUSAO_SOMENTE_RASCUNHO,
  MSG_REVERTER_RASCUNHO_BLOQUEADO,
  normalizarFaseEdital,
} from "@/lib/editais/governancaRules";
import { contarPropostasAprovadasEdital } from "@/lib/propostas/enviarPropostaPublica";

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

/** Tabelas com processo_id — login de processo so altera o proprio escopo. */
const TABELAS_PROCESSO_ID = new Set([
  "editais",
  "noticias",
  "eventos",
  "transparencia_editais",
  "transparencia_convenios",
  "transparencia_prestacao_contas",
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

async function bloquearForaDoEscopo(
  ctx: AdminContexto,
  table: string,
  action: Body["action"],
  payload: unknown,
  filters: Filter[]
): Promise<string | null> {
  if (isMestre(ctx)) return null;
  if (!TABELAS_PROCESSO_ID.has(table)) return null;

  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

  if (action === "insert" || action === "upsert") {
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const processoId = (row as { processo_id?: string | null }).processo_id;
      if (!podeAcessarProcesso(ctx, processoId)) {
        return "Processo fora do seu escopo.";
      }
    }
  }

  if (action === "update" || action === "delete") {
    const idFilter = filters.find((f) => f.column === "id");
    const id = idFilter?.value;
    if (typeof id === "string" && id.trim()) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("processo_id")
        .eq("id", id)
        .maybeSingle();
      if (error) return error.message;
      if (!podeAcessarProcesso(ctx, data?.processo_id)) {
        return "Registro fora do seu escopo de processo.";
      }
    }

    if (action === "update" && payload && typeof payload === "object") {
      const novo = (payload as { processo_id?: string | null }).processo_id;
      if (novo !== undefined && !podeAcessarProcesso(ctx, novo)) {
        return "Nao e permitido mover registro para outro processo.";
      }
    }
  }

  return null;
}

type EditalDeletePrep =
  | { ok: true; arquivoPdf: string | null }
  | { ok: false; message: string; status: 404 | 409 | 500 };

async function prepareEditalDelete(editalId: string): Promise<EditalDeletePrep> {
  const { data: edital, error: editalError } = await supabaseAdmin
    .from("editais")
    .select("id, fase_atual, arquivo_pdf")
    .eq("id", editalId)
    .maybeSingle();

  if (editalError) {
    return { ok: false, message: editalError.message, status: 500 };
  }

  if (!edital) {
    return {
      ok: false,
      message: "Edital nao encontrado para exclusao.",
      status: 404,
    };
  }

  if (!isEditalFaseRascunho(edital.fase_atual)) {
    return {
      ok: false,
      message: MSG_EXCLUSAO_SOMENTE_RASCUNHO,
      status: 409,
    };
  }

  const { data: propostas, error: fetchError } = await supabaseAdmin
    .from("propostas")
    .select("id")
    .eq("edital_id", editalId);

  if (fetchError) {
    return { ok: false, message: fetchError.message, status: 500 };
  }

  if (!propostas?.length) {
    return {
      ok: true,
      arquivoPdf: String(edital.arquivo_pdf || "").trim() || null,
    };
  }

  const { error: unlinkError } = await supabaseAdmin
    .from("propostas")
    .update({ edital_id: null })
    .eq("edital_id", editalId);

  if (unlinkError) {
    return { ok: false, message: unlinkError.message, status: 500 };
  }

  return {
    ok: true,
    arquivoPdf: String(edital.arquivo_pdf || "").trim() || null,
  };
}

function friendlyDeleteError(message: string, table: string) {
  if (
    message.includes("violates foreign key constraint") ||
    message.includes("still referenced")
  ) {
    if (table === "editais") {
      return "Nao foi possivel excluir o edital porque ainda existem registros vinculados. Remova ou desvincule propostas e documentos antes de tentar novamente.";
    }
    return "Nao foi possivel excluir porque ainda existem registros vinculados.";
  }
  return message;
}

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

    let editalPdfParaRemover: string | null = null;
    let revertingToRascunho: { editalId: string; faseAnterior: string } | null = null;

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

    const bloqueioEscopo = await bloquearForaDoEscopo(
      auth.contexto,
      table,
      action,
      payload,
      filters
    );
    if (bloqueioEscopo) {
      return NextResponse.json(
        { ok: false, error: bloqueioEscopo, data: null },
        { status: 403 }
      );
    }

    if (table === "editais" && action === "delete") {
      const idFilter = filters.find((filter) => filter.column === "id");
      const editalId = idFilter?.value;

      if (typeof editalId !== "string" || !editalId.trim()) {
        return NextResponse.json(
          { ok: false, error: "ID do edital e obrigatorio para exclusao." },
          { status: 400 }
        );
      }

      const prep = await prepareEditalDelete(editalId);
      if (prep.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            error: friendlyDeleteError(prep.message, table),
            data: null,
          },
          { status: prep.status }
        );
      }
      editalPdfParaRemover = prep.arquivoPdf;
    }

    if (table === "editais" && action === "update" && payload && typeof payload === "object") {
      const dados = payload as Record<string, unknown>;
      if (dados.fase_atual === "rascunho") {
        const idFilter = filters.find((filter) => filter.column === "id");
        const editalId = idFilter?.value;

        if (typeof editalId === "string" && editalId.trim()) {
          const { data: atual, error: atualError } = await supabaseAdmin
            .from("editais")
            .select("fase_atual")
            .eq("id", editalId)
            .maybeSingle();

          if (atualError) {
            return NextResponse.json(
              { ok: false, error: atualError.message, data: null },
              { status: 500 }
            );
          }

          if (atual && !isEditalFaseRascunho(atual.fase_atual)) {
            const aprovadas = await contarPropostasAprovadasEdital(editalId);
            if (aprovadas > 0) {
              return NextResponse.json(
                { ok: false, error: MSG_REVERTER_RASCUNHO_BLOQUEADO, data: null },
                { status: 409 }
              );
            }

            revertingToRascunho = {
              editalId,
              faseAnterior: normalizarFaseEdital(atual.fase_atual),
            };
          }
        }
      }
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
        {
          ok: false,
          error: friendlyDeleteError(result.error.message, table),
          data: null,
        },
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

      if (table === "editais" && editalPdfParaRemover) {
        await supabaseAdmin.storage
          .from("editais")
          .remove([editalPdfParaRemover])
          .catch(() => null);
      }
    }

    if (revertingToRascunho) {
      await supabaseAdmin.from("editais_logs").insert({
        edital_id: revertingToRascunho.editalId,
        acao: "fase_alterada",
        fase_anterior: revertingToRascunho.faseAnterior,
        fase_nova: "rascunho",
        observacao:
          "Retorno para Rascunho (operacao admin — testes ou limpeza).",
      });
    }

    revalidateForTable(table);
    if (table === "editais") {
      const idFilter = filters.find((filter) => filter.column === "id");
      if (typeof idFilter?.value === "string" && idFilter.value.trim()) {
        revalidatePath(`/editais/${idFilter.value}`);
      }
    }
    if (table === "documentos_publicos") {
      const payloadObj =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : null;
      const editalIdFromPayload =
        typeof payloadObj?.edital_id === "string" ? payloadObj.edital_id : null;
      const editalIdFromFilter = filters.find(
        (filter) => filter.column === "edital_id"
      )?.value;
      const editalId =
        editalIdFromPayload ||
        (typeof editalIdFromFilter === "string" ? editalIdFromFilter : null);
      if (editalId && editalId.trim()) {
        revalidatePath(`/editais/${editalId}`);
      }
    }

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
