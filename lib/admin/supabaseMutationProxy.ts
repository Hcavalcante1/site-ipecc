"use client";

/**
 * Redireciona insert/update/delete/upsert do browser para /api/admin/mutate (service role).
 * Leituras (select) continuam no cliente Supabase normal.
 */

const MUTATION_TABLES = new Set([
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

type SupabaseResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

class AdminMutationBuilder implements PromiseLike<SupabaseResult> {
  private action: Body["action"] | null = null;
  private payload: unknown;
  private filters: { column: string; value: unknown }[] = [];
  private selectCols?: string;
  private wantSingle = false;
  private upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };

  constructor(private readonly table: string) {}

  insert(values: unknown) {
    this.action = "insert";
    this.payload = values;
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(
    values: unknown,
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
  ) {
    this.action = "upsert";
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  select(columns = "*") {
    this.selectCols = columns;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  async execute(): Promise<SupabaseResult> {
    if (!this.action) {
      return {
        data: null,
        error: { message: "Nenhuma operação de gravação definida" },
      };
    }

    const res = await fetch("/api/admin/mutate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: this.table,
        action: this.action,
        payload: this.payload,
        filters: this.filters,
        select: this.selectCols,
        single: this.wantSingle,
        upsertOptions: this.upsertOptions,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      data?: unknown;
      count?: number | null;
    };

    if (!res.ok || !json.ok) {
      return {
        data: null,
        error: {
          message: json.error || `Falha ao gravar (${res.status})`,
          code: String(res.status),
        },
        status: res.status,
      };
    }

    return {
      data: json.data ?? null,
      error: null,
      count: json.count ?? null,
      status: res.status,
      statusText: "OK",
    };
  }

  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

type Body = {
  action: "insert" | "update" | "delete" | "upsert";
};

export function patchSupabaseMutations<T extends { from: (table: string) => unknown }>(
  client: T
): T {
  const originalFrom = client.from.bind(client);

  client.from = ((table: string) => {
    const builder = originalFrom(table) as Record<string, unknown>;

    if (!MUTATION_TABLES.has(table)) {
      return builder;
    }

    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === "insert" || prop === "update" || prop === "delete" || prop === "upsert") {
          return (...args: unknown[]) => {
            const mut = new AdminMutationBuilder(table);
            if (prop === "insert") return mut.insert(args[0]);
            if (prop === "update") return mut.update(args[0]);
            if (prop === "delete") return mut.delete();
            return mut.upsert(
              args[0],
              args[1] as { onConflict?: string; ignoreDuplicates?: boolean } | undefined
            );
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }) as T["from"];

  return client;
}
