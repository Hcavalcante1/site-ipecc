import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  isMestre,
  podeAcessarProcesso,
  podeModulo,
  type AdminContexto,
  type AdminModulo,
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

/** Tabelas com processo_id direto. */
const TABELAS_PROCESSO_ID = new Set([
  "editais",
  "noticias",
  "eventos",
  "transparencia_editais",
  "transparencia_convenios",
  "transparencia_prestacao_contas",
]);

/** Tabelas cujo processo vem do edital/proposta vinculado. */
const TABELAS_ESCOPO_INDIRETO = new Set([
  "propostas",
  "proposta_anexos",
  "editais_documentos",
]);

const TABELA_MODULO: Partial<Record<string, AdminModulo>> = {
  editais: "editais",
  editais_documentos: "editais",
  editais_logs: "editais",
  propostas: "propostas",
  proposta_anexos: "propostas",
  transparencia_editais: "transparencia",
  transparencia_convenios: "transparencia",
  transparencia_prestacao_contas: "transparencia",
  noticias: "noticias",
  eventos: "eventos",
  paginas: "paginas",
  paginas_conteudo: "paginas",
  paginas_eixos: "paginas",
  documentos_publicos: "paginas",
};

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

async function processoIdDoEdital(
  editalId: string | null | undefined
): Promise<string | null> {
  if (!editalId) return null;
  const { data, error } = await supabaseAdmin
    .from("editais")
    .select("processo_id")
    .eq("id", editalId)
    .maybeSingle();
  if (error) return null;
  return data?.processo_id ?? null;
}

async function processoIdDaProposta(
  propostaId: string | null | undefined
): Promise<string | null> {
  if (!propostaId) return null;
  const { data, error } = await supabaseAdmin
    .from("propostas")
    .select("edital_id")
    .eq("id", propostaId)
    .maybeSingle();
  if (error) return null;
  return processoIdDoEdital(data?.edital_id);
}

async function resolverProcessoIdLinha(
  table: string,
  id: string
): Promise<{ processoId: string | null; error?: string }> {
  if (TABELAS_PROCESSO_ID.has(table)) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("processo_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { processoId: null, error: error.message };
    return { processoId: data?.processo_id ?? null };
  }

  if (table === "propostas") {
    return { processoId: await processoIdDaProposta(id) };
  }

  if (table === "proposta_anexos") {
    const { data, error } = await supabaseAdmin
      .from("proposta_anexos")
      .select("proposta_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { processoId: null, error: error.message };
    return { processoId: await processoIdDaProposta(data?.proposta_id) };
  }

  if (table === "editais_documentos") {
    const { data, error } = await supabaseAdmin
      .from("editais_documentos")
      .select("edital_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { processoId: null, error: error.message };
    return { processoId: await processoIdDoEdital(data?.edital_id) };
  }

  return { processoId: null };
}

async function processoIdDoPayload(
  table: string,
  row: Record<string, unknown>
): Promise<string | null> {
  if (TABELAS_PROCESSO_ID.has(table)) {
    return (row.processo_id as string | null | undefined) ?? null;
  }
  if (table === "propostas" || table === "editais_documentos") {
    return processoIdDoEdital(row.edital_id as string | null | undefined);
  }
  if (table === "proposta_anexos") {
    return processoIdDaProposta(row.proposta_id as string | null | undefined);
  }
  return null;
}

async function bloquearForaDoEscopo(
  ctx: AdminContexto,
  table: string,
  action: Body["action"],
  payload: unknown,
  filters: Filter[]
): Promise<string | null> {
  if (isMestre(ctx)) return null;

  const modulo = TABELA_MODULO[table];
  if (modulo && !podeModulo(ctx, modulo)) {
    return "Módulo não liberado para esta operação.";
  }

  const precisaEscopo =
    TABELAS_PROCESSO_ID.has(table) || TABELAS_ESCOPO_INDIRETO.has(table);
  if (!precisaEscopo) return null;

  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

  if (action === "insert" || action === "upsert") {
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const processoId = await processoIdDoPayload(
        table,
        row as Record<string, unknown>
      );
      if (!podeAcessarProcesso(ctx, processoId)) {
        return "Processo fora do seu escopo.";
      }
    }
  }

  if (action === "update" || action === "delete") {
    const idFilter = filters.find((f) => f.column === "id");
    const id = idFilter?.value;
    if (typeof id !== "string" || !id.trim()) {
      return "Filtro de identificador é obrigatório para atualizar ou excluir nesta tabela.";
    }

    const resolvido = await resolverProcessoIdLinha(table, id);
    if (resolvido.error) return resolvido.error;
    if (!podeAcessarProcesso(ctx, resolvido.processoId)) {
      return "Registro fora do seu escopo de processo.";
    }

    if (action === "update" && payload && typeof payload === "object") {
      const row = payload as Record<string, unknown>;
      if (row.processo_id !== undefined && !podeAcessarProcesso(ctx, row.processo_id as string | null)) {
        return "Não é permitido mover registro para outro processo.";
      }
      if (row.edital_id !== undefined) {
        const viaEdital = await processoIdDoEdital(
          row.edital_id as string | null
        );
        if (!podeAcessarProcesso(ctx, viaEdital)) {
          return "Edital fora do seu escopo de processo.";
        }
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
      message: "Edital não encontrado para exclusão.",
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
    return "Não foi possível excluir porque ainda existem registros vinculados.";
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
        { ok: false, error: "Filtros são obrigatórios para atualizar ou excluir" },
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
          { ok: false, error: "Identificador do edital é obrigatório para exclusão." },
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
          { ok: false, error: "Filtro inválido" },
          { status: 400 }
        );
      }

      if (!ALLOWED_FILTER_OPERATORS.has(op)) {
        return NextResponse.json(
          { ok: false, error: "Operador de filtro não permitido" },
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
