import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildGdTemplateBody } from "@/lib/documentos/templatePresets";

export type DocumentoTipoRow = {
  codigo: string;
  label: string;
  descricao: string | null;
  para_publicacao: boolean;
  para_emissao: boolean;
  para_prestacao: boolean;
  tipo_publicacao_padrao: string | null;
  ativo: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export const DOCUMENTOS_TIPOS_FALLBACK: DocumentoTipoRow[] = [
  { codigo: "edital", label: "Edital", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 10 },
  { codigo: "anexo", label: "Anexo", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 20 },
  { codigo: "ata", label: "Ata", descricao: null, para_publicacao: true, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: "ata", ativo: true, sort_order: 30 },
  { codigo: "parecer", label: "Parecer", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 40 },
  { codigo: "recurso", label: "Recurso", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 50 },
  { codigo: "julgamento", label: "Julgamento", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 60 },
  { codigo: "resultado_preliminar", label: "Resultado preliminar", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 70 },
  { codigo: "resultado_final", label: "Resultado final", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 80 },
  { codigo: "homologacao", label: "Homologação", descricao: null, para_publicacao: true, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: "homologacao", ativo: true, sort_order: 90 },
  { codigo: "adjudicacao", label: "Adjudicação", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 100 },
  { codigo: "contrato", label: "Contrato", descricao: null, para_publicacao: true, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: "contrato", ativo: true, sort_order: 110 },
  { codigo: "termo_parceria", label: "Termo de parceria", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 120 },
  { codigo: "prestacao_de_contas", label: "Prestação de contas", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 130 },
  { codigo: "encerramento", label: "Encerramento", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 140 },
  { codigo: "declaracao", label: "Declaração", descricao: null, para_publicacao: true, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: "declaracao", ativo: true, sort_order: 150 },
  { codigo: "nota_esclarecimento", label: "Nota de esclarecimento", descricao: null, para_publicacao: true, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: "nota_esclarecimento", ativo: true, sort_order: 160 },
  { codigo: "esclarecimento", label: "Esclarecimento", descricao: null, para_publicacao: true, para_emissao: false, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 170 },
  { codigo: "plano_de_trabalho", label: "Plano de trabalho", descricao: null, para_publicacao: false, para_emissao: true, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 200 },
  { codigo: "relatorio_tecnico_parcial", label: "Relatório técnico parcial", descricao: null, para_publicacao: false, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 210 },
  { codigo: "parecer_tecnico", label: "Parecer técnico", descricao: null, para_publicacao: false, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 250 },
  { codigo: "documento_complementar", label: "Documento complementar", descricao: null, para_publicacao: false, para_emissao: false, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 290 },
  { codigo: "oficio", label: "Ofício", descricao: null, para_publicacao: false, para_emissao: true, para_prestacao: false, tipo_publicacao_padrao: null, ativo: true, sort_order: 300 },
  { codigo: "relatorio", label: "Relatório", descricao: null, para_publicacao: false, para_emissao: true, para_prestacao: true, tipo_publicacao_padrao: null, ativo: true, sort_order: 310 },
];

export function slugifyTipoCodigo(raw: string): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 63);
}

export function labelTipoDocumento(
  codigo: string | null | undefined,
  catalog?: DocumentoTipoRow[] | null
): string {
  const c = String(codigo || "").trim();
  if (!c) return "Documento";
  const fromCat = (catalog || []).find(
    (t) => t.codigo === c || t.label === c
  );
  if (fromCat?.label) return fromCat.label;
  const fb = DOCUMENTOS_TIPOS_FALLBACK.find(
    (t) => t.codigo === c || t.label === c
  );
  if (fb?.label) return fb.label;
  return c.replace(/_/g, " ");
}

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

const SELECT_COLS =
  "codigo, label, descricao, para_publicacao, para_emissao, para_prestacao, tipo_publicacao_padrao, ativo, sort_order, created_at, updated_at";

function filterFallback(opts?: {
  apenasAtivos?: boolean;
  paraPublicacao?: boolean;
  paraEmissao?: boolean;
  paraPrestacao?: boolean;
}) {
  let list = DOCUMENTOS_TIPOS_FALLBACK.filter((t) =>
    opts?.apenasAtivos === false ? true : t.ativo
  );
  if (opts?.paraPublicacao) list = list.filter((t) => t.para_publicacao);
  if (opts?.paraEmissao) list = list.filter((t) => t.para_emissao);
  if (opts?.paraPrestacao) list = list.filter((t) => t.para_prestacao);
  return list;
}

export async function listarDocumentosTipos(opts?: {
  apenasAtivos?: boolean;
  paraPublicacao?: boolean;
  paraEmissao?: boolean;
  paraPrestacao?: boolean;
}) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("documentos_tipos")
    .select(SELECT_COLS)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (opts?.apenasAtivos !== false) query = query.eq("ativo", true);
  if (opts?.paraPublicacao) query = query.eq("para_publicacao", true);
  if (opts?.paraEmissao) query = query.eq("para_emissao", true);
  if (opts?.paraPrestacao) query = query.eq("para_prestacao", true);

  const { data, error } = await query;
  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        data: filterFallback(opts),
        error: null,
        aviso:
          "Catálogo documentos_tipos ausente. Aplique docs/sql/documentos-tipos-catalogo.sql no Supabase.",
      };
    }
    // Coluna para_prestacao pode faltar em schema antigo: retry sem filtro
    if (/para_prestacao/i.test(error.message || "")) {
      const retry = await admin
        .from("documentos_tipos")
        .select(
          "codigo, label, descricao, para_publicacao, para_emissao, tipo_publicacao_padrao, ativo, sort_order, created_at, updated_at"
        )
        .order("sort_order", { ascending: true });
      if (!retry.error) {
        let rows = (retry.data || []).map((r) => ({
          ...r,
          para_prestacao: false,
        })) as DocumentoTipoRow[];
        if (opts?.apenasAtivos !== false) {
          rows = rows.filter((t) => t.ativo);
        }
        if (opts?.paraPublicacao) {
          rows = rows.filter((t) => t.para_publicacao);
        }
        if (opts?.paraEmissao) rows = rows.filter((t) => t.para_emissao);
        if (opts?.paraPrestacao) {
          return {
            data: filterFallback(opts),
            error: null,
            aviso:
              "Coluna para_prestacao ausente. Reaplique docs/sql/documentos-tipos-catalogo.sql.",
          };
        }
        return { data: rows, error: null, aviso: null as string | null };
      }
    }
    return { data: null, error, aviso: null as string | null };
  }
  return { data: (data || []) as DocumentoTipoRow[], error: null, aviso: null as string | null };
}

export async function obterTipoPublicacaoPadrao(tipoEmissao: string) {
  const codigo = String(tipoEmissao || "").trim();
  if (!codigo) return "anexo";

  const { data } = await listarDocumentosTipos({ apenasAtivos: false });
  const row = (data || []).find((t) => t.codigo === codigo);
  if (row?.tipo_publicacao_padrao) return row.tipo_publicacao_padrao;

  switch (codigo) {
    case "edital_cotacao":
    case "edital_chamamento":
      return "edital";
    case "ata_selecao":
    case "ata":
      return "ata";
    case "homologacao":
      return "homologacao";
    case "contrato":
      return "contrato";
    case "declaracao":
      return "declaracao";
    case "nota_esclarecimento":
      return "nota_esclarecimento";
    default:
      return codigo;
  }
}

export async function criarDocumentoTipo(opts: {
  label: string;
  codigo?: string | null;
  descricao?: string | null;
  paraPublicacao?: boolean;
  paraEmissao?: boolean;
  paraPrestacao?: boolean;
  tipoPublicacaoPadrao?: string | null;
  userId?: string | null;
  criarModeloEmissao?: boolean;
}) {
  const label = String(opts.label || "").trim();
  if (!label) {
    return { data: null, error: { message: "Informe o nome do tipo." } };
  }

  const codigo = slugifyTipoCodigo(opts.codigo || label);
  if (!codigo || !/^[a-z][a-z0-9_]{1,62}$/.test(codigo)) {
    return {
      data: null,
      error: {
        message:
          "Código inválido. Use letras minúsculas, números e underscore (ex.: nota_esclarecimento).",
      },
    };
  }

  const paraPublicacao = opts.paraPublicacao !== false;
  const paraEmissao = Boolean(opts.paraEmissao);
  const paraPrestacao = Boolean(opts.paraPrestacao);
  const tipoPubPadrao =
    String(opts.tipoPublicacaoPadrao || "").trim() ||
    (paraEmissao ? codigo : null);

  const admin = getSupabaseAdmin();
  const insertPayload: Record<string, unknown> = {
    codigo,
    label,
    descricao: opts.descricao?.trim() || null,
    para_publicacao: paraPublicacao,
    para_emissao: paraEmissao,
    para_prestacao: paraPrestacao,
    tipo_publicacao_padrao: tipoPubPadrao,
    ativo: true,
    sort_order: 200,
    created_by: opts.userId || null,
    updated_at: new Date().toISOString(),
  };

  let data: DocumentoTipoRow | null = null;
  let error: { message?: string; code?: string } | null = null;

  {
    const inserted = await admin
      .from("documentos_tipos")
      .insert(insertPayload)
      .select(SELECT_COLS)
      .single();
    data = (inserted.data as DocumentoTipoRow | null) || null;
    error = inserted.error;
  }

  if (error && /para_prestacao/i.test(error.message || "")) {
    delete insertPayload.para_prestacao;
    const retry = await admin
      .from("documentos_tipos")
      .insert(insertPayload)
      .select(
        "codigo, label, descricao, para_publicacao, para_emissao, tipo_publicacao_padrao, ativo, sort_order, created_at, updated_at"
      )
      .single();
    data = retry.data
      ? ({ ...retry.data, para_prestacao: paraPrestacao } as DocumentoTipoRow)
      : null;
    error = retry.error;
  }

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        data: null,
        error: {
          message:
            "Catálogo ausente. Aplique docs/sql/documentos-tipos-catalogo.sql no Supabase.",
        },
      };
    }
    if (error.code === "23505") {
      return {
        data: null,
        error: { message: `Já existe o tipo "${codigo}".` },
      };
    }
    return { data: null, error: { message: error.message } };
  }

  if (paraEmissao && opts.criarModeloEmissao !== false) {
    const slug = `${codigo}-modelo`.slice(0, 80);
    await admin.from("documentos_oficiais_modelos").insert({
      slug,
      titulo: label,
      tipo_emissao: codigo,
      tipo_publicacao: tipoPubPadrao || codigo,
      modalidade: "qualquer",
      fase_minima: "rascunho",
      corpo_texto: buildGdTemplateBody(codigo, label, {
        titulo: "",
        objeto:
          "Conte?do institucional m?nimo do documento. Ajuste apenas os campos vari?veis espec?ficos deste tipo.",
        prazo: "Conforme cronograma institucional",
        partes: "",
        destinatario: "",
        assunto: "",
        fundamento:
          "Conforme legisla??o aplic?vel, regulamentos internos e diretrizes institucionais.",
        observacoes:
          "Documento gerado no padr?o institucional do IPECC e publicado somente ap?s assinatura.",
        periodo: "",
        metas: "",
        resultados: "",
        responsavel: "",
        declaracao: "",
      }),
      ativo: true,
    });
  }

  return { data, error: null };
}

export async function atualizarDocumentoTipo(opts: {
  codigo: string;
  label?: string;
  descricao?: string | null;
  ativo?: boolean;
  paraPublicacao?: boolean;
  paraEmissao?: boolean;
  paraPrestacao?: boolean;
  tipoPublicacaoPadrao?: string | null;
}) {
  const codigo = String(opts.codigo || "").trim();
  if (!codigo) {
    return { data: null, error: { message: "Código obrigatório." } };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (opts.label !== undefined) patch.label = String(opts.label).trim();
  if (opts.descricao !== undefined) {
    patch.descricao = opts.descricao?.trim() || null;
  }
  if (opts.ativo !== undefined) patch.ativo = Boolean(opts.ativo);
  if (opts.paraPublicacao !== undefined) {
    patch.para_publicacao = Boolean(opts.paraPublicacao);
  }
  if (opts.paraEmissao !== undefined) {
    patch.para_emissao = Boolean(opts.paraEmissao);
  }
  if (opts.paraPrestacao !== undefined) {
    patch.para_prestacao = Boolean(opts.paraPrestacao);
  }
  if (opts.tipoPublicacaoPadrao !== undefined) {
    patch.tipo_publicacao_padrao =
      opts.tipoPublicacaoPadrao?.trim() || null;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("documentos_tipos")
    .update(patch)
    .eq("codigo", codigo)
    .select(SELECT_COLS)
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }
  return { data, error: null };
}
