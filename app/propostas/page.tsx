"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import AdminToast, { triggerToast } from "@/components/AdminToast";
import {
  editalAceitaEnvioProposta,
  isEnvioPropostaModoTeste,
} from "@/lib/editais/governancaRules";
import { isModalidadeCotacaoPrevia } from "@/lib/editais/tiposAdmin";

type TipoPessoa = "pessoa_juridica" | "osc" | "pessoa_fisica";
type CategoriaDocumento =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica";

type EtapaFormulario =
  | "dados"
  | CategoriaDocumento
  | "resumo";

type NivelDocumento = "obrigatorio" | "condicional" | "opcional";

type DocumentoChecklist = {
  key: string;
  label: string;
  nivel: NivelDocumento;
  hint?: string;
};

type EditalOpcao = {
  id: string;
  titulo?: string | null;
  tipo?: string | null;
  periodo?: string | null;
  periodo_envio?: string | null;
  status?: string | null;
  fase_atual?: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "12px 14px",
  fontSize: 15,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 15,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const LABEL_TIPO_PESSOA: Record<TipoPessoa, string> = {
  pessoa_juridica: "Pessoa Jurídica",
  osc: "OSC",
  pessoa_fisica: "Pessoa Física",
};

const LABEL_CATEGORIA: Record<CategoriaDocumento, string> = {
  habilitacao_juridica: "Habilitação jurídica e institucional",
  regularidade_fiscal_trabalhista: "Regularidade fiscal e trabalhista",
  qualificacao_tecnica: "Qualificação técnica e operacional",
};

const CATEGORIAS_ORDEM: CategoriaDocumento[] = [
  "habilitacao_juridica",
  "regularidade_fiscal_trabalhista",
  "qualificacao_tecnica",
];

const ETAPAS: { id: EtapaFormulario; titulo: string }[] = [
  { id: "dados", titulo: "Dados da proponente" },
  { id: "habilitacao_juridica", titulo: LABEL_CATEGORIA.habilitacao_juridica },
  {
    id: "regularidade_fiscal_trabalhista",
    titulo: LABEL_CATEGORIA.regularidade_fiscal_trabalhista,
  },
  { id: "qualificacao_tecnica", titulo: LABEL_CATEGORIA.qualificacao_tecnica },
  { id: "resumo", titulo: "Resumo e envio final" },
];

const AVISO_CHECKLIST =
  "A documentação pode variar conforme o edital. Envie os documentos exigidos no edital específico. Os itens condicionais devem ser anexados apenas quando solicitados.";

const AVISO_CHECKLIST_COTACAO =
  "Cotação prévia de preços: no envio inicial costumam bastar a proposta comercial e a identificação (CNPJ/CPF). Certidões e documentos completos de habilitação, em geral, só são pedidos ao fornecedor selecionado — anexe itens condicionais apenas se o termo de referência exigir nesta etapa.";

const NIVEL_BADGE: Record<
  NivelDocumento,
  { texto: string; bg: string; color: string; subtitulo?: string }
> = {
  obrigatorio: { texto: "Obrigatório", bg: "#dcfce7", color: "#14532d" },
  condicional: {
    texto: "Condicional",
    bg: "#fef3c7",
    color: "#92400e",
    subtitulo: "Enviar se o edital exigir",
  },
  opcional: { texto: "Opcional", bg: "#f1f5f9", color: "#475569" },
};

const DOCUMENTOS_POR_TIPO: Record<
  TipoPessoa,
  Record<CategoriaDocumento, DocumentoChecklist[]>
> = {
  osc: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Formulário de Inscrição / Proposta ao Chamamento Público",
        nivel: "obrigatorio",
      },
      {
        key: "estatuto",
        label: "Estatuto Social Consolidado e Registrado em Cartório",
        nivel: "obrigatorio",
      },
      {
        key: "ata_posse",
        label: "Ata de Eleição e Posse da Diretoria Vigente",
        nivel: "obrigatorio",
      },
      {
        key: "cnpj",
        label: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
        nivel: "obrigatorio",
      },
      {
        key: "doc_representante",
        label:
          "Cópia de Documento de Identidade e CPF do Representante Legal",
        nivel: "obrigatorio",
      },
      {
        key: "procuracao",
        label: "Procuração com Poderes Específicos para o Certame",
        nivel: "condicional",
      },
      {
        key: "declaracao_consolidada_edital",
        label: "Declaração Consolidada de Atendimento ao Edital",
        nivel: "condicional",
      },
      {
        key: "declaracao_ciencia_edital",
        label: "Declaração de Ciência, Concordância e Atendimento ao Edital",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        key: "certidao_federal",
        label:
          "Certidão Negativa de Débitos Relativos aos Tributos Federais e à Dívida Ativa da União",
        nivel: "obrigatorio",
      },
      {
        key: "certidao_estadual",
        label: "Certidão de Regularidade Fiscal Estadual",
        nivel: "condicional",
      },
      {
        key: "certidao_municipal",
        label: "Certidão de Regularidade Fiscal Municipal",
        nivel: "condicional",
      },
      {
        key: "fgts",
        label: "Certificado de Regularidade do FGTS — CRF",
        nivel: "obrigatorio",
      },
      {
        key: "cndt",
        label: "Certidão Negativa de Débitos Trabalhistas — CNDT",
        nivel: "obrigatorio",
      },
    ],
    qualificacao_tecnica: [
      {
        key: "plano_trabalho",
        label: "Plano de Trabalho",
        nivel: "obrigatorio",
      },
      {
        key: "portfolio",
        label: "Portfólio / Catálogo de Realizações Anteriores",
        nivel: "condicional",
      },
      {
        key: "atestado_tecnico",
        label: "Atestado de Capacidade Técnica em Objeto Similar",
        nivel: "condicional",
      },
      {
        key: "equipe_tecnica",
        label: "Relação de Equipe Técnica e Responsáveis",
        nivel: "condicional",
      },
      {
        key: "relatorios",
        label: "Relatórios de Execução / Prestação Anterior",
        nivel: "opcional",
      },
      {
        key: "alvara",
        label: "Alvará de Funcionamento",
        nivel: "condicional",
      },
      {
        key: "licenca_sanitaria",
        label: "Licença Sanitária",
        nivel: "condicional",
      },
      {
        key: "licenca_ambiental",
        label: "Licença Ambiental",
        nivel: "condicional",
      },
      {
        key: "crea_art",
        label: "CREA / ART / RRT do Responsável Técnico",
        nivel: "condicional",
      },
    ],
  },

  pessoa_juridica: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Proposta Comercial / Formulário de Proposta",
        nivel: "obrigatorio",
      },
      {
        key: "contrato_social",
        label: "Contrato Social Consolidado e Alterações Contratuais Registradas",
        nivel: "obrigatorio",
      },
      {
        key: "cnpj",
        label: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
        nivel: "obrigatorio",
      },
      {
        key: "doc_representante",
        label: "Documento de Identidade e CPF do Representante Legal",
        nivel: "obrigatorio",
      },
      {
        key: "procuracao",
        label: "Procuração com Poderes Específicos para o Certame",
        nivel: "condicional",
      },
      {
        key: "alvara",
        label: "Alvará de Funcionamento",
        nivel: "condicional",
      },
      {
        key: "declaracao_consolidada_edital",
        label: "Declaração Consolidada de Atendimento ao Edital",
        nivel: "condicional",
      },
      {
        key: "declaracao_ciencia_edital",
        label: "Declaração de Ciência, Concordância e Atendimento ao Edital",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        key: "certidao_federal",
        label:
          "Certidão Negativa de Débitos Relativos aos Tributos Federais e à Dívida Ativa da União",
        nivel: "obrigatorio",
      },
      {
        key: "certidao_estadual",
        label: "Certidão de Regularidade Fiscal Estadual",
        nivel: "condicional",
      },
      {
        key: "certidao_municipal",
        label: "Certidão de Regularidade Fiscal Municipal",
        nivel: "condicional",
      },
      {
        key: "fgts",
        label: "Certificado de Regularidade do FGTS — CRF",
        nivel: "obrigatorio",
      },
      {
        key: "cndt",
        label: "Certidão Negativa de Débitos Trabalhistas — CNDT",
        nivel: "obrigatorio",
      },
      {
        key: "certidao_falencia",
        label: "Certidão Negativa de Falência e Recuperação Judicial",
        nivel: "condicional",
      },
    ],
    qualificacao_tecnica: [
      {
        key: "atestado_tecnico",
        label: "Atestado de Capacidade Técnica em Objeto Similar",
        nivel: "condicional",
      },
      {
        key: "qualificacao_tecnica",
        label: "Documentos de Qualificação Técnica",
        nivel: "condicional",
      },
      {
        key: "equipe_tecnica",
        label: "Relação de Equipe Técnica e Responsáveis",
        nivel: "condicional",
      },
      {
        key: "balanco_patrimonial",
        label: "Balanço Patrimonial do Último Exercício Social",
        nivel: "condicional",
      },
      {
        key: "demonstracoes_financeiras",
        label: "Demonstrações Contábeis",
        nivel: "condicional",
      },
      {
        key: "crea_art",
        label: "Registro CREA/CAU/Conselho Profissional e ART/RRT/CAT",
        nivel: "condicional",
      },
      {
        key: "licenca_sanitaria",
        label: "Licença Sanitária",
        nivel: "condicional",
      },
      {
        key: "licenca_ambiental",
        label: "Licença Ambiental",
        nivel: "condicional",
      },
    ],
  },

  pessoa_fisica: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Formulário de Inscrição / Proposta Individual",
        nivel: "obrigatorio",
      },
      {
        key: "doc_pessoal",
        label: "Documento Oficial de Identificação com Foto",
        nivel: "obrigatorio",
      },
      {
        key: "cpf",
        label: "Cadastro de Pessoa Física — CPF",
        nivel: "obrigatorio",
      },
      {
        key: "comprovante_residencia",
        label: "Comprovante de Residência",
        nivel: "condicional",
      },
      {
        key: "declaracao_ciencia_edital",
        label: "Declaração de Ciência, Concordância e Atendimento ao Edital",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        key: "certidao_federal",
        label:
          "Certidão Negativa de Débitos Relativos aos Tributos Federais e à Dívida Ativa da União",
        nivel: "condicional",
      },
      {
        key: "certidao_estadual",
        label: "Certidão de Regularidade Fiscal Estadual",
        nivel: "condicional",
      },
      {
        key: "certidao_municipal",
        label: "Certidão de Regularidade Fiscal Municipal",
        nivel: "condicional",
      },
    ],
    qualificacao_tecnica: [
      {
        key: "portfolio",
        label: "Portfólio / Catálogo de Realizações Anteriores",
        nivel: "opcional",
      },
      {
        key: "formacao",
        label: "Certificados de Formação e Capacitação",
        nivel: "opcional",
      },
      {
        key: "registro_profissional",
        label: "Registro Profissional em Conselho de Classe",
        nivel: "condicional",
      },
      {
        key: "atestado_tecnico",
        label: "Atestado de Capacidade Técnica em Objeto Similar",
        nivel: "condicional",
      },
    ],
  },
};

/**
 * Checklist enxuto para Cotação prévia de preços.
 * Padrão de mercado: no envio inicial basta proposta comercial + identificação;
 * habilitação fiscal/jurídica completa costuma ser exigida só do fornecedor selecionado.
 */
const DOCUMENTOS_COTACAO_PREVIA: Record<
  TipoPessoa,
  Record<CategoriaDocumento, DocumentoChecklist[]>
> = {
  pessoa_juridica: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Proposta comercial / Cotação de preços (PDF)",
        nivel: "obrigatorio",
        hint: "Em papel timbrado, com preços unitários/totais, validade da proposta e dados da empresa.",
      },
      {
        key: "cnpj",
        label: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
        nivel: "obrigatorio",
      },
      {
        key: "contrato_social",
        label: "Contrato Social (somente se o TR exigir nesta etapa)",
        nivel: "condicional",
      },
      {
        key: "doc_representante",
        label: "Documento do representante legal (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "certidao_federal",
        label: "Certidão federal / Dívida Ativa (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "fgts",
        label: "CRF do FGTS (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "cndt",
        label: "CNDT (somente se o TR exigir)",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [],
    qualificacao_tecnica: [],
  },
  osc: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Proposta comercial / Cotação de preços (PDF)",
        nivel: "obrigatorio",
        hint: "Em papel timbrado, com preços unitários/totais, validade da proposta e dados da organização.",
      },
      {
        key: "cnpj",
        label: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
        nivel: "obrigatorio",
      },
      {
        key: "estatuto",
        label: "Estatuto social (somente se o TR exigir nesta etapa)",
        nivel: "condicional",
      },
      {
        key: "doc_representante",
        label: "Documento do representante legal (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "certidao_federal",
        label: "Certidão federal / Dívida Ativa (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "fgts",
        label: "CRF do FGTS (somente se o TR exigir)",
        nivel: "condicional",
      },
      {
        key: "cndt",
        label: "CNDT (somente se o TR exigir)",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [],
    qualificacao_tecnica: [],
  },
  pessoa_fisica: {
    habilitacao_juridica: [
      {
        key: "proposta",
        label: "Proposta comercial / Cotação de preços (PDF)",
        nivel: "obrigatorio",
      },
      {
        key: "doc_pessoal",
        label: "Documento oficial de identificação com foto",
        nivel: "obrigatorio",
      },
      {
        key: "cpf",
        label: "Cadastro de Pessoa Física — CPF",
        nivel: "obrigatorio",
      },
      {
        key: "certidao_federal",
        label: "Certidão federal (somente se o TR exigir)",
        nivel: "condicional",
      },
    ],
    regularidade_fiscal_trabalhista: [],
    qualificacao_tecnica: [],
  },
};

function aplicarUrlsNoInsert(
  data: Record<string, unknown>,
  arquivosEnviados: Record<string, string>
) {
  const mapa: Record<string, string> = {
    cnpj: "cnpj_url",
    contrato_social: "contrato_social_url",
    estatuto: "estatuto_url",
    ata_posse: "ata_posse_url",
    doc_pessoal: "doc_pessoal_url",
    doc_representante: "doc_representante_url",
    procuracao: "procuracao_url",
    certidao_federal: "certidao_federal_url",
    certidao_estadual: "certidao_estadual_url",
    certidao_municipal: "certidao_municipal_url",
    fgts: "fgts_url",
    cndt: "cndt_url",
    atestado_tecnico: "atestado_tecnico_url",
    qualificacao_tecnica: "qualificacao_tecnica_url",
    equipe_tecnica: "equipe_tecnica_url",
    portfolio: "portfolio_url",
    formacao: "formacao_url",
    registro_profissional: "registro_profissional_url",
    comprovante_residencia: "comprovante_residencia_url",
    cpf: "cpf_url",
  };

  Object.entries(mapa).forEach(([key, coluna]) => {
    if (arquivosEnviados[key]) {
      data[coluna] = arquivosEnviados[key];
    }
  });
}

function UploadItem({
  documento,
  file,
  onChange,
}: {
  documento: DocumentoChecklist;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const badge = NIVEL_BADGE[documento.nivel];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "#fff",
        padding: "12px 14px",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "4px 10px",
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.texto}
        </span>
        {badge.subtitulo ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>{badge.subtitulo}</span>
        ) : null}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
        {documento.label}
      </div>
      {documento.hint ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
          {documento.hint}
        </p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label
          style={{
            background: "#22c55e",
            color: "#052e16",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          Selecionar PDF
          <input
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <span style={{ color: "#111827", fontSize: 14 }}>
          {file ? file.name : "Nenhum arquivo selecionado"}
        </span>
      </div>
    </div>
  );
}

function AvisoErro({ mensagem }: { mensagem: string }) {
  return (
    <p
      role="alert"
      style={{
        margin: "0 0 16px",
        padding: "10px 14px",
        borderRadius: 10,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {mensagem}
    </p>
  );
}

export default function PropostasPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 24 }}>Carregando formulário...</div>}>
      <PropostasPageClient />
    </Suspense>
  );
}

function PropostasPageClient() {
  const searchParams = useSearchParams();
  const codigoEditalUrl = (searchParams.get("codigo") || "").trim();
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pessoa_juridica");
  const [etapa, setEtapa] = useState<EtapaFormulario>("dados");
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({});
  const [editais, setEditais] = useState<EditalOpcao[]>([]);
  const [editalId, setEditalId] = useState(codigoEditalUrl);
  const [carregandoEditais, setCarregandoEditais] = useState(true);
  const [secoesSalvasLocal, setSecoesSalvasLocal] = useState<
    Partial<Record<CategoriaDocumento, boolean>>
  >({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [camposInvalidos, setCamposInvalidos] = useState<Set<string>>(new Set());

  function limparErroCampo() {
    if (erro) setErro(null);
    if (camposInvalidos.size > 0) setCamposInvalidos(new Set());
  }

  function focar(id: string) {
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  }

  const [dados, setDados] = useState({
    nome: "",
    documento: "",
    email: "",
    telefone: "",
    mensagem: "",
  });

  const editalSelecionado = useMemo(
    () => editais.find((edital) => edital.id === editalId) ?? null,
    [editais, editalId]
  );

  const isCotacaoPrevia = isModalidadeCotacaoPrevia(editalSelecionado?.tipo);

  const checklistPorCategoria = useMemo(() => {
    const fonte = isCotacaoPrevia
      ? DOCUMENTOS_COTACAO_PREVIA
      : DOCUMENTOS_POR_TIPO;

    return CATEGORIAS_ORDEM.map((cat) => ({
      categoria: cat,
      titulo:
        isCotacaoPrevia && cat === "habilitacao_juridica"
          ? "Documentos da cotação"
          : LABEL_CATEGORIA[cat],
      documentos: fonte[tipoPessoa][cat] || [],
    })).filter((secao) => secao.documentos.length > 0);
  }, [tipoPessoa, isCotacaoPrevia]);

  const etapasVisiveis = useMemo(() => {
    const categoriasComDocs = new Set(
      checklistPorCategoria.map((s) => s.categoria)
    );
    return ETAPAS.filter((item) => {
      if (item.id === "dados" || item.id === "resumo") return true;
      return categoriasComDocs.has(item.id as CategoriaDocumento);
    }).map((item) => {
      if (item.id === "habilitacao_juridica" && isCotacaoPrevia) {
        return { ...item, titulo: "Documentos da cotação" };
      }
      return item;
    });
  }, [checklistPorCategoria, isCotacaoPrevia]);

  useEffect(() => {
    if (
      etapa !== "dados" &&
      etapa !== "resumo" &&
      !checklistPorCategoria.some((s) => s.categoria === etapa)
    ) {
      setEtapa("dados");
    }
  }, [checklistPorCategoria, etapa]);

  useEffect(() => {
    setArquivos({});
    setSecoesSalvasLocal({});
  }, [editalId, isCotacaoPrevia]);

  useEffect(() => {
    async function carregarEditaisAbertos() {
      setCarregandoEditais(true);

      const { data } = await supabase
        .from("editais")
        .select("id,titulo,tipo,periodo,periodo_envio,status,fase_atual")
        .order("created_at", { ascending: false });

      const abertos = ((data || []) as EditalOpcao[]).filter((edital) =>
        editalAceitaEnvioProposta(edital)
      );

      setEditais(abertos);
      setEditalId((atual) => {
        const preferido = codigoEditalUrl || atual;
        if (preferido && abertos.some((edital) => edital.id === preferido)) {
          return preferido;
        }
        return abertos[0]?.id ?? "";
      });
      setCarregandoEditais(false);
    }

    carregarEditaisAbertos();
  }, [codigoEditalUrl]);

  function setArquivo(key: string, file: File | null) {
    setArquivos((prev) => ({ ...prev, [key]: file }));
  }

  function limparDocumentosEMensagem() {
    setArquivos({});
    setSecoesSalvasLocal({});
    setDados({
      nome: "",
      documento: "",
      email: "",
      telefone: "",
      mensagem: "",
    });
    setErro(null);
    setCamposInvalidos(new Set());
    setEtapa("dados");
  }

  function trocarTipoPessoa(novoTipo: TipoPessoa) {
    setTipoPessoa(novoTipo);
    limparDocumentosEMensagem();
  }

  function proximaEtapaApos(categoria: CategoriaDocumento): EtapaFormulario {
    const ids = etapasVisiveis.map((item) => item.id);
    const idx = ids.indexOf(categoria);
    if (idx >= 0 && idx < ids.length - 1) {
      return ids[idx + 1];
    }
    return "resumo";
  }

  function salvarDocumentosSecao(categoria: CategoriaDocumento) {
    const secao = checklistPorCategoria.find((s) => s.categoria === categoria);
    if (!secao) return;

    const obrigatoriosFaltando = secao.documentos.filter(
      (doc) => doc.nivel === "obrigatorio" && !arquivos[doc.key]
    );

    if (obrigatoriosFaltando.length > 0) {
      setErro(
        `Anexe os documentos obrigatórios antes de continuar: ${obrigatoriosFaltando
          .map((doc) => doc.label)
          .join(", ")}.`
      );
      return;
    }

    setErro(null);
    setSecoesSalvasLocal((prev) => ({ ...prev, [categoria]: true }));
    setEtapa(proximaEtapaApos(categoria));
  }

  async function uploadArquivo(file: File, tipoArquivo: string) {
    const nomeLimpo = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const nome = `${Date.now()}-${tipoArquivo}-${nomeLimpo}`;

    const { error } = await supabase.storage.from("propostas").upload(nome, file);

    if (error) throw error;

    return nome;
  }

  async function handleEnviarProposta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCamposInvalidos(new Set());

    if (!editalId) {
      setErro("Selecione o edital ou chamamento vinculado antes de enviar.");
      setCamposInvalidos(new Set(["campo-edital"]));
      setEtapa("dados");
      focar("campo-edital");
      return;
    }

    if (!editalSelecionado || !editalAceitaEnvioProposta(editalSelecionado)) {
      setErro(
        "Este edital não está aceitando propostas no momento. Atualize a página ou selecione outro edital."
      );
      setCamposInvalidos(new Set(["campo-edital"]));
      setEtapa("dados");
      focar("campo-edital");
      return;
    }

    const faltando = new Set<string>();
    if (!dados.nome.trim()) faltando.add("campo-nome");
    if (!dados.documento.trim()) faltando.add("campo-documento");
    if (!dados.email.trim()) faltando.add("campo-email");

    if (faltando.size > 0) {
      setErro("Preencha os dados da proponente antes de enviar.");
      setCamposInvalidos(faltando);
      setEtapa("dados");
      focar([...faltando][0]);
      return;
    }

    const propostaFile = arquivos["proposta"];
    if (!propostaFile) {
      setErro(
        isCotacaoPrevia
          ? "Envie a proposta comercial / cotação de preços (PDF)."
          : "Envie o formulário de inscrição / proposta principal (PDF)."
      );
      setEtapa("habilitacao_juridica");
      return;
    }

    if (isCotacaoPrevia) {
      const obrigatoriosFaltando = checklistPorCategoria
        .flatMap((s) => s.documentos)
        .filter((d) => d.nivel === "obrigatorio" && d.key !== "proposta")
        .filter((d) => !arquivos[d.key]);

      if (obrigatoriosFaltando.length > 0) {
        setErro(
          `Na cotação prévia, anexe também: ${obrigatoriosFaltando
            .map((d) => d.label)
            .join("; ")}.`
        );
        setEtapa("habilitacao_juridica");
        return;
      }
    }

    try {
      setEnviando(true);

      const arquivo_url = await uploadArquivo(propostaFile, "proposta");
      const arquivosEnviados: Record<string, string> = {};
      const linhasAnexosPorSecao: string[] = [];

      for (const secao of checklistPorCategoria) {
        const partes: string[] = [];

        for (const doc of secao.documentos) {
          const file = arquivos[doc.key];
          if (!file || doc.key === "proposta") continue;
          const path = await uploadArquivo(file, doc.key);
          arquivosEnviados[doc.key] = path;
          partes.push(`${doc.key}: ${path}`);
        }

        if (partes.length > 0) {
          linhasAnexosPorSecao.push(
            `Anexos enviados — ${secao.titulo}: ${partes.join(" | ")}`
          );
        }
      }

      const mensagemFinal = [
        dados.mensagem.trim(),
        "",
        `Tipo de pessoa: ${LABEL_TIPO_PESSOA[tipoPessoa]}`,
        "Categoria: Envio completo com múltiplas categorias documentais",
        "Envio completo com múltiplas categorias documentais",
        ...linhasAnexosPorSecao,
      ]
        .filter(Boolean)
        .join("\n");

      const data: Record<string, unknown> = {
        nome: dados.nome.trim(),
        cnpj: dados.documento.trim(),
        email: dados.email.trim(),
        telefone: dados.telefone.trim(),
        mensagem: mensagemFinal,
        tipo: tipoPessoa,
        categoria: "habilitacao_juridica",
        arquivo_url,
        edital_id: editalId,
      };

      aplicarUrlsNoInsert(data, arquivosEnviados);

      const res = await fetch("/api/propostas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Erro ao enviar proposta.");
      }

      if (process.env.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA === "true") {
        try {
          const res = await fetch("/api/propostas/registrar-anexos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: dados.email.trim(),
            }),
          });
          if (!res.ok) {
            console.warn(
              "proposta_anexos: sincronização não concluída",
              await res.text()
            );
          }
        } catch (syncErr) {
          console.warn("proposta_anexos: falha ao sincronizar", syncErr);
        }
      }

      triggerToast("Proposta enviada com sucesso!", "success");
      setTipoPessoa("pessoa_juridica");
      setEditalId("");
      limparDocumentosEMensagem();
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Erro ao enviar proposta";
      triggerToast(msg, "error");
    } finally {
      setEnviando(false);
    }
  }

  function renderNavegacaoEtapas() {
    return (
      <nav
        className="public-form-steps"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 20,
        }}
        aria-label="Etapas do formulário"
      >
        {etapasVisiveis.map((item) => {
          const ativa = etapa === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setErro(null);
                setEtapa(item.id);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: ativa ? "2px solid #14532d" : "1px solid #d1d5db",
                background: ativa ? "#dcfce7" : "#fff",
                color: ativa ? "#14532d" : "#374151",
                fontWeight: ativa ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {item.titulo}
            </button>
          );
        })}
      </nav>
    );
  }

  function renderSecaoDocumentos(categoria: CategoriaDocumento) {
    const secao = checklistPorCategoria.find((s) => s.categoria === categoria);
    if (!secao) return null;

    const salva = secoesSalvasLocal[categoria];

    return (
      <div>
        <p
          style={{
            marginTop: 0,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#14532d",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {isCotacaoPrevia ? AVISO_CHECKLIST_COTACAO : AVISO_CHECKLIST}
        </p>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>
          {LABEL_TIPO_PESSOA[tipoPessoa]} — preencha os documentos desta seção. O envio
          ao servidor ocorre apenas ao final.
        </p>
        {salva ? (
          <p
            style={{
              color: "#14532d",
              fontWeight: 700,
              fontSize: 14,
              margin: "12px 0",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#dcfce7",
              border: "1px solid #86efac",
            }}
          >
            Documentos desta seção salvos. Avance para a próxima etapa.
          </p>
        ) : null}
        {erro && <AvisoErro mensagem={erro} />}
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {secao.documentos.map((doc) => (
            <UploadItem
              key={doc.key}
              documento={doc}
              file={arquivos[doc.key] ?? null}
              onChange={(file) => setArquivo(doc.key, file)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => salvarDocumentosSecao(categoria)}
          style={{
            marginTop: 18,
            background: "#14532d",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 999,
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            fontSize: 15,
          }}
        >
          Salvar e continuar
        </button>
      </div>
    );
  }

  function renderResumo() {
    const anexosPorSecao = checklistPorCategoria.map((secao) => {
      const itens = secao.documentos
        .filter((d) => arquivos[d.key])
        .map((d) => `${d.label}: ${arquivos[d.key]?.name}`);
      return { titulo: secao.titulo, itens };
    });

    return (
      <div>
        <h3 style={{ marginTop: 0, color: "#14532d" }}>Confira antes de enviar</h3>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Dados da proponente</p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Edital / chamamento:</strong>{" "}
            {editalSelecionado?.titulo || "—"}
            {editalSelecionado?.tipo ? ` — ${editalSelecionado.tipo}` : ""}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Tipo:</strong> {LABEL_TIPO_PESSOA[tipoPessoa]}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Nome:</strong> {dados.nome || "—"}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>{tipoPessoa === "pessoa_fisica" ? "CPF" : "CNPJ"}:</strong>{" "}
            {dados.documento || "—"}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>E-mail:</strong> {dados.email || "—"}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Telefone:</strong> {dados.telefone || "—"}
          </p>
        </div>
        {anexosPorSecao.map((bloco) => (
          <div
            key={bloco.titulo}
            style={{
              marginBottom: 14,
              padding: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14 }}>
              {bloco.titulo}
            </p>
            {bloco.itens.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Nenhum arquivo selecionado nesta seção.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {bloco.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Será criado <strong>um único registro</strong> de proposta com todos os anexos
          selecionados.{" "}
          {isCotacaoPrevia
            ? "Na cotação prévia, são obrigatórios a proposta comercial e a identificação (CNPJ ou documento/CPF). Demais itens só se o TR exigir."
            : "Apenas o PDF da proposta principal é obrigatório para concluir o envio."}
        </p>
        <button
          type="submit"
          disabled={enviando}
          style={{
            marginTop: 18,
            background: "#111827",
            color: "#fff",
            padding: "14px",
            borderRadius: 999,
            border: "none",
            fontWeight: 700,
            cursor: enviando ? "wait" : "pointer",
            width: "100%",
            fontSize: 16,
          }}
        >
          {enviando ? "Enviando..." : "Enviar proposta"}
        </button>
      </div>
    );
  }

  return (
    <>
      <AdminToast />
      <PublicHeroRolling
        bgImage="/media/heroes/propostas/hero.webp"
        title="Enviar Proposta"
        text="Preencha os dados e a documentação em etapas. O envio definitivo cria uma única proposta com todos os anexos selecionados."
      />

      <PublicWhatsAppHelpLine
        assunto="propostas"
        intro="Dúvidas sobre o envio?"
      />

      <section className="public-form-shell">
        <div className="public-form-shell__inner">
          <form
            onSubmit={handleEnviarProposta}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {renderNavegacaoEtapas()}

            {etapa === "dados" && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 16,
                    fontSize: 24,
                    color: "#14532d",
                  }}
                >
                  Dados da proponente
                </h2>
                {erro && <AvisoErro mensagem={erro} />}
                <div
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                  }}
                >
                  <label
                    style={{ display: "block", marginBottom: 6, fontSize: 14 }}
                    htmlFor="campo-edital"
                  >
                    Edital ou chamamento vinculado
                  </label>
                  <select
                    id="campo-edital"
                    value={editalId}
                    onChange={(e) => {
                      limparErroCampo();
                      setEditalId(e.target.value);
                    }}
                    disabled={carregandoEditais || editais.length === 0}
                    required
                    aria-invalid={camposInvalidos.has("campo-edital")}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      background: "#fff",
                      ...(camposInvalidos.has("campo-edital")
                        ? { border: "1px solid #dc2626" }
                        : {}),
                    }}
                  >
                    {carregandoEditais ? (
                      <option value="">Carregando editais...</option>
                    ) : editais.length === 0 ? (
                      <option value="">Nenhum edital aberto para propostas</option>
                    ) : (
                      editais.map((edital) => (
                        <option key={edital.id} value={edital.id}>
                          {edital.titulo || "Edital / Chamamento"}
                          {edital.tipo ? ` — ${edital.tipo}` : ""}
                          {isEnvioPropostaModoTeste(edital) ? " [teste interno]" : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#1e3a8a" }}>
                    A proposta ficara registrada com referencia ao edital selecionado.
                    {editalSelecionado && isEnvioPropostaModoTeste(editalSelecionado)
                      ? " Ambiente de testes (Rascunho): nao aparece no site publico."
                      : " A analise e a decisao (aprovar ou rejeitar) sao humanas."}
                  </p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
                    Tipo de participante
                  </label>
                  <select
                    value={tipoPessoa}
                    onChange={(e) =>
                      trocarTipoPessoa(e.target.value as TipoPessoa)
                    }
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="pessoa_juridica">Pessoa Jurídica</option>
                    <option value="osc">OSC</option>
                    <option value="pessoa_fisica">Pessoa Física</option>
                  </select>
                </div>
                <div className="public-form-grid-2">
                  <input
                    id="campo-nome"
                    placeholder="Nome da proponente"
                    required
                    aria-invalid={camposInvalidos.has("campo-nome")}
                    style={{
                      ...inputStyle,
                      ...(camposInvalidos.has("campo-nome")
                        ? { border: "1px solid #dc2626" }
                        : {}),
                    }}
                    value={dados.nome}
                    onChange={(e) => {
                      limparErroCampo();
                      setDados((p) => ({ ...p, nome: e.target.value }));
                    }}
                  />
                  <input
                    id="campo-documento"
                    placeholder={
                      tipoPessoa === "pessoa_fisica" ? "CPF" : "CNPJ"
                    }
                    required
                    aria-invalid={camposInvalidos.has("campo-documento")}
                    style={{
                      ...inputStyle,
                      ...(camposInvalidos.has("campo-documento")
                        ? { border: "1px solid #dc2626" }
                        : {}),
                    }}
                    value={dados.documento}
                    onChange={(e) => {
                      limparErroCampo();
                      setDados((p) => ({ ...p, documento: e.target.value }));
                    }}
                  />
                </div>
                <div className="public-form-grid-2">
                  <input
                    id="campo-email"
                    placeholder="E-mail"
                    required
                    type="email"
                    aria-invalid={camposInvalidos.has("campo-email")}
                    style={{
                      ...inputStyle,
                      ...(camposInvalidos.has("campo-email")
                        ? { border: "1px solid #dc2626" }
                        : {}),
                    }}
                    value={dados.email}
                    onChange={(e) => {
                      limparErroCampo();
                      setDados((p) => ({ ...p, email: e.target.value }));
                    }}
                  />
                  <input
                    placeholder="Telefone"
                    required
                    style={inputStyle}
                    value={dados.telefone}
                    onChange={(e) =>
                      setDados((p) => ({ ...p, telefone: e.target.value }))
                    }
                  />
                </div>
                <textarea
                  placeholder="Mensagem / observações"
                  rows={5}
                  style={textareaStyle}
                  value={dados.mensagem}
                  onChange={(e) =>
                    setDados((p) => ({ ...p, mensagem: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setEtapa("habilitacao_juridica")}
                  style={{
                    marginTop: 16,
                    background: "#14532d",
                    color: "#fff",
                    padding: "12px 20px",
                    borderRadius: 999,
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Continuar para documentação
                </button>
              </div>
            )}

            {etapa === "habilitacao_juridica" && (
              <div
                style={{
                  background: "linear-gradient(90deg, #0d6efd, #00c6a7)",
                  padding: 24,
                  borderRadius: 18,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 8,
                    color: "#fff",
                    fontSize: 22,
                  }}
                >
                  {isCotacaoPrevia
                    ? "Documentos da cotação"
                    : LABEL_CATEGORIA.habilitacao_juridica}
                </h2>
                {renderSecaoDocumentos("habilitacao_juridica")}
              </div>
            )}

            {etapa === "regularidade_fiscal_trabalhista" && (
              <div
                style={{
                  background: "linear-gradient(90deg, #0d6efd, #00c6a7)",
                  padding: 24,
                  borderRadius: 18,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 8,
                    color: "#fff",
                    fontSize: 22,
                  }}
                >
                  {LABEL_CATEGORIA.regularidade_fiscal_trabalhista}
                </h2>
                {renderSecaoDocumentos("regularidade_fiscal_trabalhista")}
              </div>
            )}

            {etapa === "qualificacao_tecnica" && (
              <div
                style={{
                  background: "linear-gradient(90deg, #0d6efd, #00c6a7)",
                  padding: 24,
                  borderRadius: 18,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 8,
                    color: "#fff",
                    fontSize: 22,
                  }}
                >
                  {LABEL_CATEGORIA.qualificacao_tecnica}
                </h2>
                {renderSecaoDocumentos("qualificacao_tecnica")}
              </div>
            )}

            {etapa === "resumo" && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 16,
                    fontSize: 24,
                    color: "#14532d",
                  }}
                >
                  Resumo e envio final
                </h2>
                {renderResumo()}
              </div>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
