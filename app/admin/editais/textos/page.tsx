"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminTokens } from "@/components/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TipoPessoa = "pessoa_juridica" | "osc" | "pessoa_fisica";
type CategoriaDocumento =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica";

type Documento = {
  id?: string;
  pagina_slug: string;
  tipo_pessoa: TipoPessoa;
  categoria: CategoriaDocumento;
  titulo: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
};

const TIPOS_PESSOA: { value: TipoPessoa; label: string }[] = [
  { value: "pessoa_juridica", label: "Pessoa Jurídica" },
  { value: "osc", label: "OSC" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
];

const CATEGORIAS: { value: CategoriaDocumento; label: string }[] = [
  { value: "habilitacao_juridica", label: "Habilitação Jurídica" },
  {
    value: "regularidade_fiscal_trabalhista",
    label: "Regularidade Fiscal e Trabalhista",
  },
  { value: "qualificacao_tecnica", label: "Qualificação Técnica" },
];

const LABEL_TIPO_PESSOA: Record<TipoPessoa, string> = {
  pessoa_juridica: "Pessoa Jurídica",
  osc: "OSC",
  pessoa_fisica: "Pessoa Física",
};

const LABEL_CATEGORIA: Record<CategoriaDocumento, string> = {
  habilitacao_juridica: "Habilitação Jurídica",
  regularidade_fiscal_trabalhista: "Regularidade Fiscal e Trabalhista",
  qualificacao_tecnica: "Qualificação Técnica",
};

const MODELOS_DOCUMENTOS: Record<
  TipoPessoa,
  Record<CategoriaDocumento, { titulo: string; descricao: string }[]>
> = {
  pessoa_juridica: {
    habilitacao_juridica: [
      {
        titulo:
          "Registro comercial, no caso de empresário individual, quando cabível",
        descricao:
          "Documento comprobatório do registro do empresário individual, quando aplicável à natureza jurídica do proponente.",
      },
      {
        titulo:
          "Ato constitutivo, estatuto ou contrato social em vigor, devidamente registrado, com as alterações posteriores ou consolidação",
        descricao:
          "Documento constitutivo da pessoa jurídica, devidamente registrado no órgão competente, acompanhado das alterações posteriores ou da versão consolidada vigente.",
      },
      {
        titulo:
          "Comprovante de inscrição no Cadastro Nacional da Pessoa Jurídica – CNPJ",
        descricao:
          "Documento emitido pela Receita Federal que comprove a inscrição e a situação cadastral ativa da pessoa jurídica.",
      },
      {
        titulo: "Documento de identificação do representante legal",
        descricao:
          "Documento oficial de identificação do representante legal ou administrador com poderes para responder pela pessoa jurídica.",
      },
      {
        titulo:
          "Instrumento de mandato ou procuração, quando houver representação por terceiro",
        descricao:
          "Documento comprobatório dos poderes de representação, quando os atos forem praticados por procurador ou representante constituído.",
      },
      {
        titulo:
          "Autorização para o exercício da atividade, quando exigida em razão do objeto",
        descricao:
          "Documento específico exigido em razão da atividade a ser exercida ou da natureza do objeto previsto no edital.",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        titulo: "Prova de inscrição no CNPJ",
        descricao:
          "Documento comprobatório da inscrição ativa da pessoa jurídica no Cadastro Nacional da Pessoa Jurídica.",
      },
      {
        titulo:
          "Prova de inscrição no cadastro de contribuintes estadual e/ou municipal, se houver, relativo ao domicílio ou sede do licitante e pertinente ao seu ramo de atividade",
        descricao:
          "Documento de inscrição cadastral junto ao fisco estadual e/ou municipal, quando aplicável à atividade desenvolvida.",
      },
      {
        titulo:
          "Certidão conjunta relativa aos tributos federais e à dívida ativa da União",
        descricao:
          "Certidão comprobatória de regularidade fiscal perante a União e a Dívida Ativa da União.",
      },
      {
        titulo: "Certidão de regularidade perante a Fazenda Estadual",
        descricao:
          "Certidão emitida pela Fazenda Estadual competente, comprovando a regularidade fiscal do proponente.",
      },
      {
        titulo: "Certidão de regularidade perante a Fazenda Municipal",
        descricao:
          "Certidão emitida pela Fazenda Municipal competente, comprovando a regularidade fiscal do proponente.",
      },
      {
        titulo: "Certificado de Regularidade do FGTS – CRF",
        descricao:
          "Documento emitido pela Caixa Econômica Federal que comprove a regularidade do empregador perante o FGTS.",
      },
      {
        titulo: "Certidão Negativa de Débitos Trabalhistas – CNDT",
        descricao:
          "Certidão comprobatória de regularidade perante a Justiça do Trabalho.",
      },
    ],
    qualificacao_tecnica: [
      {
        titulo:
          "Comprovação de aptidão para desempenho de atividade pertinente e compatível com o objeto",
        descricao:
          "Documentação comprobatória da capacidade técnica para execução de atividade compatível com o objeto previsto no edital.",
      },
      {
        titulo:
          "Atestado(s) de capacidade técnica emitido(s) por pessoa jurídica de direito público ou privado, quando exigido",
        descricao:
          "Documento(s) emitido(s) por contratante anterior, comprovando execução satisfatória de objeto similar ou compatível.",
      },
      {
        titulo:
          "Indicação de equipe técnica ou profissional responsável, quando cabível",
        descricao:
          "Relação dos profissionais ou da equipe técnica vinculada à execução do objeto, quando exigida.",
      },
      {
        titulo:
          "Comprovação de qualificação técnico-profissional e/ou técnico-operacional, quando cabível",
        descricao:
          "Documentos que demonstrem a qualificação da equipe e/ou a experiência operacional da proponente, conforme a natureza do objeto.",
      },
      {
        titulo:
          "Registro ou inscrição na entidade profissional competente, quando exigido em razão da atividade",
        descricao:
          "Documento de registro da empresa ou do profissional em conselho ou entidade competente, quando exigido para a atividade.",
      },
      {
        titulo:
          "Outros documentos técnicos previstos no edital, conforme a complexidade do objeto",
        descricao:
          "Documentos complementares de natureza técnica que venham a ser expressamente exigidos no instrumento convocatório.",
      },
    ],
  },
  osc: {
    habilitacao_juridica: [
      {
        titulo: "Estatuto social em vigor, devidamente registrado",
        descricao:
          "Documento constitutivo da organização da sociedade civil, devidamente registrado em cartório ou órgão competente.",
      },
      {
        titulo:
          "Ata de eleição e posse da atual diretoria, devidamente registrada, quando aplicável",
        descricao:
          "Documento comprobatório da composição da diretoria vigente e da representação legal da entidade.",
      },
      {
        titulo:
          "Comprovante de inscrição no Cadastro Nacional da Pessoa Jurídica – CNPJ",
        descricao:
          "Documento emitido pela Receita Federal que comprove a inscrição e a situação cadastral ativa da organização.",
      },
      {
        titulo: "Documento de identificação do representante legal",
        descricao:
          "Documento oficial de identificação do presidente, dirigente ou representante legal da entidade.",
      },
      {
        titulo:
          "Instrumento de mandato ou procuração, quando houver representação por terceiro",
        descricao:
          "Documento que comprove os poderes de representação, quando houver procurador ou representante constituído.",
      },
      {
        titulo: "Autorização específica, quando exigida em razão do objeto",
        descricao:
          "Documento específico eventualmente exigido em razão da natureza da atividade ou do objeto previsto no edital.",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        titulo: "Prova de inscrição no CNPJ",
        descricao:
          "Documento comprobatório da inscrição ativa da entidade no Cadastro Nacional da Pessoa Jurídica.",
      },
      {
        titulo:
          "Prova de inscrição no cadastro de contribuintes estadual e/ou municipal, se houver",
        descricao:
          "Documento de inscrição cadastral perante o fisco estadual e/ou municipal, quando aplicável.",
      },
      {
        titulo:
          "Certidão conjunta relativa aos tributos federais e à dívida ativa da União",
        descricao:
          "Certidão comprobatória de regularidade fiscal perante a União e a Dívida Ativa da União.",
      },
      {
        titulo: "Certidão de regularidade perante a Fazenda Estadual",
        descricao:
          "Certidão emitida pela Fazenda Estadual competente, comprovando regularidade fiscal.",
      },
      {
        titulo: "Certidão de regularidade perante a Fazenda Municipal",
        descricao:
          "Certidão emitida pela Fazenda Municipal competente, comprovando regularidade fiscal.",
      },
      {
        titulo: "Certificado de Regularidade do FGTS – CRF",
        descricao:
          "Documento emitido pela Caixa Econômica Federal que comprove a regularidade do empregador perante o FGTS.",
      },
      {
        titulo: "Certidão Negativa de Débitos Trabalhistas – CNDT",
        descricao:
          "Certidão comprobatória de regularidade perante a Justiça do Trabalho.",
      },
    ],
    qualificacao_tecnica: [
      {
        titulo:
          "Comprovação de experiência prévia na execução de objeto compatível",
        descricao:
          "Documentação que demonstre experiência anterior da organização em atividades, projetos ou serviços compatíveis com o objeto.",
      },
      {
        titulo:
          "Atestado(s) de capacidade técnica emitido(s) por pessoa jurídica de direito público ou privado, quando exigido",
        descricao:
          "Documento(s) emitido(s) por entidades públicas ou privadas, comprovando experiência e execução satisfatória de objeto similar.",
      },
      {
        titulo:
          "Relação de equipe técnica, profissionais ou responsáveis pela execução, quando cabível",
        descricao:
          "Relação nominal dos profissionais, técnicos ou responsáveis vinculados à execução do objeto, quando exigida.",
      },
      {
        titulo:
          "Comprovação de qualificação técnico-profissional e/ou técnico-operacional, quando cabível",
        descricao:
          "Documentos que demonstrem a qualificação da equipe e/ou da organização para a execução do objeto.",
      },
      {
        titulo:
          "Relatório de atividades, portfólio institucional ou documentação equivalente, quando previsto no edital",
        descricao:
          "Documentação institucional comprobatória da trajetória, experiência e capacidade operacional da organização.",
      },
      {
        titulo:
          "Outros documentos técnicos previstos no edital, conforme a natureza do objeto",
        descricao:
          "Documentos complementares de natureza técnica expressamente previstos no edital.",
      },
    ],
  },
  pessoa_fisica: {
    habilitacao_juridica: [
      {
        titulo: "Documento oficial de identificação com foto",
        descricao:
          "Documento oficial de identificação civil válido e legível do proponente.",
      },
      {
        titulo: "Prova de inscrição no Cadastro de Pessoas Físicas – CPF",
        descricao:
          "Documento comprobatório da inscrição do proponente no Cadastro de Pessoas Físicas.",
      },
      {
        titulo: "Comprovante de residência, quando exigido",
        descricao:
          "Documento atualizado de comprovação de endereço, quando exigido pelo edital.",
      },
      {
        titulo:
          "Documento que comprove autorização para o exercício da atividade, quando cabível",
        descricao:
          "Documento específico exigido em razão da atividade a ser exercida, quando aplicável.",
      },
      {
        titulo: "Procuração, quando houver representação por terceiro",
        descricao:
          "Documento comprobatório dos poderes de representação, quando houver procurador ou representante constituído.",
      },
    ],
    regularidade_fiscal_trabalhista: [
      {
        titulo: "Prova de inscrição no CPF",
        descricao:
          "Documento comprobatório da inscrição regular do proponente no Cadastro de Pessoas Físicas.",
      },
      {
        titulo:
          "Prova de inscrição no cadastro de contribuintes estadual e/ou municipal, se houver",
        descricao:
          "Documento de inscrição cadastral junto ao fisco estadual e/ou municipal, quando aplicável à atividade exercida.",
      },
      {
        titulo:
          "Certidão conjunta relativa aos tributos federais e à dívida ativa da União, quando exigida",
        descricao:
          "Certidão comprobatória de regularidade perante a União e a Dívida Ativa da União, quando exigida.",
      },
      {
        titulo:
          "Certidão de regularidade perante a Fazenda Estadual, quando exigida",
        descricao:
          "Certidão emitida pela Fazenda Estadual competente, quando aplicável.",
      },
      {
        titulo:
          "Certidão de regularidade perante a Fazenda Municipal, quando exigida",
        descricao:
          "Certidão emitida pela Fazenda Municipal competente, quando aplicável.",
      },
      {
        titulo:
          "Comprovação de regularidade trabalhista ou previdenciária, quando cabível em razão do objeto",
        descricao:
          "Documentação comprobatória de regularidade trabalhista ou previdenciária, quando exigida pelo objeto ou edital.",
      },
      {
        titulo: "Outros documentos de regularidade previstos no edital",
        descricao:
          "Documentos complementares de regularidade fiscal, social ou trabalhista previstos no instrumento convocatório.",
      },
    ],
    qualificacao_tecnica: [
      {
        titulo:
          "Comprovação de aptidão para desempenho de atividade pertinente e compatível com o objeto",
        descricao:
          "Documentação comprobatória da aptidão do proponente para executar atividade compatível com o objeto.",
      },
      {
        titulo:
          "Atestado(s) de capacidade técnica, declaração(ões) de experiência, portfólio ou documentação equivalente, quando exigido",
        descricao:
          "Documentos que comprovem experiência anterior ou capacidade técnica do proponente, quando exigidos.",
      },
      {
        titulo:
          "Comprovação de formação, qualificação profissional ou registro em conselho competente, quando cabível",
        descricao:
          "Documentação comprobatória de formação, qualificação específica ou registro profissional, quando exigido.",
      },
      {
        titulo:
          "Outros documentos técnicos previstos no edital, conforme a natureza do objeto",
        descricao:
          "Documentos complementares de natureza técnica previstos no edital, conforme o objeto.",
      },
    ],
  },
};

const pageStyle: React.CSSProperties = {
  padding: adminTokens.spacing.xxxl,
};
const containerStyle: React.CSSProperties = { maxWidth: 1280, margin: "0 auto" };

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7dc",
  borderRadius: adminTokens.borderRadius.md,
  padding: adminTokens.spacing.xl,
  boxShadow: "0 10px 24px rgba(16,24,40,0.06)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: adminTokens.sizes.input.padding,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: 14,
  background: "#fff",
};

const btnGreen: React.CSSProperties = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: adminTokens.borderRadius.full,
  padding: `${adminTokens.spacing.md}px ${adminTokens.spacing.sm * 2}px`,
  cursor: "pointer",
  fontWeight: adminTokens.typography.fontWeight.bold,
};

const btnDark: React.CSSProperties = {
  background: "#14532d",
  color: "#ffffff",
  border: "none",
  borderRadius: adminTokens.borderRadius.full,
  padding: `${adminTokens.spacing.md}px ${adminTokens.spacing.sm * 2}px`,
  cursor: "pointer",
  fontWeight: adminTokens.typography.fontWeight.bold,
};

const btnRed: React.CSSProperties = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: adminTokens.borderRadius.full,
  padding: `${adminTokens.spacing.md}px ${adminTokens.spacing.sm * 2}px`,
  cursor: "pointer",
  fontWeight: adminTokens.typography.fontWeight.bold,
};

const ghostBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#14532d",
  border: "1px solid #dbe7dc",
  borderRadius: adminTokens.borderRadius.full,
  padding: "9px 14px",
  cursor: "pointer",
  fontWeight: adminTokens.typography.fontWeight.bold,
};

export default function EditaisDocumentosAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pessoa_juridica");
  const [categoria, setCategoria] =
    useState<CategoriaDocumento>("habilitacao_juridica");

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [buscaModelo, setBuscaModelo] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const modelosAtuais = useMemo(() => {
    const lista = MODELOS_DOCUMENTOS[tipoPessoa][categoria] || [];
    const termo = buscaModelo.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter(
      (item) =>
        item.titulo.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo)
    );
  }, [tipoPessoa, categoria, buscaModelo]);

  const agrupados = useMemo(() => {
    return {
      pessoa_juridica: documentos.filter((d) => d.tipo_pessoa === "pessoa_juridica"),
      osc: documentos.filter((d) => d.tipo_pessoa === "osc"),
      pessoa_fisica: documentos.filter((d) => d.tipo_pessoa === "pessoa_fisica"),
    };
  }, [documentos]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverOpen && popoverRef.current && !popoverRef.current.contains(target)) {
        setPopoverOpen(false);
      }
      if (editOpen && editRef.current && !editRef.current.contains(target)) {
        setEditOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popoverOpen, editOpen]);

  useEffect(() => {
    setSelecionados([]);
    setBuscaModelo("");
    setPopoverOpen(false);
  }, [tipoPessoa, categoria]);

  async function carregarDados() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("editais_documentos")
      .select("*")
      .eq("pagina_slug", "editais")
      .order("tipo_pessoa", { ascending: true })
      .order("categoria", { ascending: true })
      .order("ordem", { ascending: true });

    if (error) {
      setMsg("Erro ao carregar documentos.");
      setLoading(false);
      return;
    }

    setDocumentos((data || []) as Documento[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function toggleSelecionado(tituloDocumento: string) {
    setSelecionados((prev) =>
      prev.includes(tituloDocumento)
        ? prev.filter((item) => item !== tituloDocumento)
        : [...prev, tituloDocumento]
    );
  }

  function selecionarTodos() {
    setSelecionados(modelosAtuais.map((item) => item.titulo));
  }

  function limparSelecao() {
    setSelecionados([]);
  }

  async function gravarSelecionados() {
    if (!selecionados.length) {
      setMsg("Selecione pelo menos um documento oficial.");
      return;
    }

    setSaving(true);
    setMsg("");

    const existentes = documentos.filter(
      (d) => d.tipo_pessoa === tipoPessoa && d.categoria === categoria
    );
    const titulosExistentes = new Set(existentes.map((d) => d.titulo));

    const modelosSalvar = (MODELOS_DOCUMENTOS[tipoPessoa][categoria] || []).filter(
      (item) => selecionados.includes(item.titulo) && !titulosExistentes.has(item.titulo)
    );

    if (!modelosSalvar.length) {
      setMsg("Os documentos selecionados já foram gravados nesta categoria.");
      setSaving(false);
      return;
    }

    const ordemBase = existentes.length;

    const payload = modelosSalvar.map((item, index) => ({
      pagina_slug: "editais",
      tipo_pessoa: tipoPessoa,
      categoria,
      titulo: item.titulo,
      descricao: item.descricao,
      ordem: ordemBase + index + 1,
      ativo: true,
    }));

    const { error } = await supabase.from("editais_documentos").insert(payload);

    if (error) {
      setMsg("Erro ao gravar documentos selecionados.");
      setSaving(false);
      return;
    }

    setMsg("Documentos oficiais gravados com sucesso.");
    setSelecionados([]);
    setPopoverOpen(false);
    await carregarDados();
    setSaving(false);
  }

  function abrirEdicao(item: Documento) {
    setEditId(item.id || null);
    setTipoPessoa(item.tipo_pessoa);
    setCategoria(item.categoria);
    setTitulo(item.titulo);
    setDescricao(item.descricao || "");
    setOrdem(item.ordem || 1);
    setAtivo(!!item.ativo);
    setEditOpen(true);
  }

  function limparEdicao() {
    setEditId(null);
    setTitulo("");
    setDescricao("");
    setOrdem(1);
    setAtivo(true);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    setSaving(true);
    setMsg("");

    const { error } = await supabase
      .from("editais_documentos")
      .update({
        tipo_pessoa: tipoPessoa,
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        ordem: Number(ordem) || 1,
        ativo,
      })
      .eq("id", editId);

    if (error) {
      setMsg("Erro ao salvar alterações.");
      setSaving(false);
      return;
    }

    setMsg("Documento atualizado com sucesso.");
    setEditOpen(false);
    limparEdicao();
    await carregarDados();
    setSaving(false);
  }

  async function excluirItem(id?: string) {
    if (!id) return;
    const ok = window.confirm("Deseja realmente excluir este documento?");
    if (!ok) return;

    const { error } = await supabase
      .from("editais_documentos")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg("Erro ao excluir documento.");
      return;
    }

    setMsg("Documento excluído com sucesso.");
    await carregarDados();
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renderListaPorTipo(tipo: TipoPessoa, itens: Documento[]) {
    return (
      <div style={{ ...cardStyle, marginTop: adminTokens.spacing.xl }}>
        <h3 style={{ margin: 0, color: "#14532d", fontSize: 20 }}>
          {LABEL_TIPO_PESSOA[tipo]}
        </h3>

        <div
          style={{
            display: "grid",
            gap: adminTokens.spacing.base,
            marginTop: adminTokens.spacing.lg,
          }}
        >
         {CATEGORIAS.map((cat) => {
  const filtrados = itens.filter((item) => item.categoria === cat.value);
  const key = `${tipo}_${cat.value}`;
  const isOpen = !!expandedGroups[key];
            return (
              <div
                key={key}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "#f8fafc",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${adminTokens.spacing.lg}px ${adminTokens.spacing.sm * 2}px`,
                    fontWeight: adminTokens.typography.fontWeight.bold,
                    color: "#0f172a",
                    textAlign: "left",
                  }}
                >
                  <span>
                    {LABEL_CATEGORIA[cat.value]} ({filtrados.length})
                  </span>
                  <span>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: `0 ${adminTokens.spacing.sm * 2}px ${adminTokens.spacing.sm * 2}px`,
                    }}
                  >
                    {!filtrados.length ? (
                      <p style={{ margin: 0, color: "#64748b" }}>
                        Nenhum item nesta categoria.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
                        {filtrados.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #dbe7dc",
                              borderRadius: adminTokens.borderRadius.sm,
                              padding: adminTokens.spacing.base,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: adminTokens.spacing.base,
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <strong style={{ color: "#0f172a", fontSize: 14 }}>
                                {item.titulo}
                              </strong>
                              <div
                                style={{
                                  marginTop: adminTokens.spacing.xs,
                                  fontSize: 12,
                                  color: "#64748b",
                                }}
                              >
                                Ordem: {item.ordem || 0} | Ativo: {item.ativo ? "Sim" : "Não"}
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: adminTokens.spacing.sm,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => abrirEdicao(item)}
                                style={ghostBtn}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => excluirItem(item.id)}
                                style={btnRed}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: adminTokens.spacing.xl }}>
          <h1 style={{ margin: 0, color: "#14532d", fontSize: 30 }}>
            Editais — Documentação
          </h1>
          <p style={{ marginTop: adminTokens.spacing.sm, color: "#475569" }}>
            Selecione os documentos oficiais por categoria e grave. A listagem abaixo permanece compacta.
          </p>
        </div>

        {msg ? (
          <div
            style={{
              marginBottom: adminTokens.spacing.sm * 2,
              background: "#ecfdf5",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: adminTokens.borderRadius.sm,
              padding: `${adminTokens.spacing.base}px ${adminTokens.spacing.lg}px`,
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        ) : null}

        <section style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto auto",
              gap: adminTokens.spacing.md,
              alignItems: "center",
            }}
          >
            <select
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value as TipoPessoa)}
              style={inputStyle}
            >
              {TIPOS_PESSOA.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
              style={inputStyle}
            >
              {CATEGORIAS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <div style={{ position: "relative" }} ref={popoverRef}>
              <button
                type="button"
                style={btnDark}
                onClick={() => setPopoverOpen((prev) => !prev)}
              >
                Modelos oficiais
              </button>

              {popoverOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: `calc(100% + ${adminTokens.spacing.sm}px)`,
                    left: 0,
                    width: 520,
                    maxWidth: "min(520px, calc(100vw - 80px))",
                    background: "#fff",
                    border: "1px solid #dbe7dc",
                    borderRadius: 16,
                    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                    padding: adminTokens.spacing.base,
                    zIndex: 40,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: adminTokens.spacing.base,
                      marginBottom: adminTokens.spacing.md,
                    }}
                  >
                    <strong style={{ color: "#14532d", fontSize: 14 }}>
                      {LABEL_TIPO_PESSOA[tipoPessoa]} / {LABEL_CATEGORIA[categoria]}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setPopoverOpen(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        fontWeight: adminTokens.typography.fontWeight.bold,
                      }}
                    >
                      Fechar
                    </button>
                  </div>

                  <input
                    value={buscaModelo}
                    onChange={(e) => setBuscaModelo(e.target.value)}
                    placeholder="Buscar documento"
                    style={{ ...inputStyle, marginBottom: adminTokens.spacing.md }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: adminTokens.spacing.sm,
                      flexWrap: "wrap",
                      marginBottom: adminTokens.spacing.md,
                    }}
                  >
                    <button type="button" onClick={selecionarTodos} style={ghostBtn}>
                      Selecionar todos
                    </button>
                    <button type="button" onClick={limparSelecao} style={ghostBtn}>
                      Limpar
                    </button>
                  </div>

                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: "auto",
                      border: `1px solid ${adminTokens.colors.text.secondary}`,
                      borderRadius: adminTokens.borderRadius.sm,
                      background: "#f8fafc",
                      padding: adminTokens.spacing.sm,
                    }}
                  >
                    {!modelosAtuais.length ? (
                      <p
                        style={{
                          margin: 0,
                          color: "#64748b",
                          padding: adminTokens.spacing.sm,
                        }}
                      >
                        Nenhum modelo encontrado.
                      </p>
                    ) : (
                      modelosAtuais.map((item) => (
                        <label
                          key={item.titulo}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: adminTokens.spacing.md,
                            padding: `${adminTokens.spacing.sm}px ${adminTokens.spacing.xs}px`,
                            cursor: "pointer",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: 14,
                            lineHeight: 1.4,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selecionados.includes(item.titulo)}
                            onChange={() => toggleSelecionado(item.titulo)}
                            style={{ marginTop: 3 }}
                          />
                          <span>{item.titulo}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              style={btnGreen}
              onClick={gravarSelecionados}
              disabled={saving}
            >
              Gravar
            </button>
          </div>
        </section>

        {editOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.35)",
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: adminTokens.spacing.xxxl,
            }}
          >
            <div
              ref={editRef}
              style={{
                width: 720,
                maxWidth: "100%",
                background: "#fff",
                borderRadius: adminTokens.borderRadius.md,
                border: "1px solid #dbe7dc",
                boxShadow: "0 20px 40px rgba(15,23,42,0.2)",
                padding: adminTokens.spacing.base + adminTokens.spacing.sm,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: adminTokens.spacing.base,
                  marginBottom: adminTokens.spacing.lg,
                }}
              >
                <h2 style={{ margin: 0, color: "#14532d", fontSize: 22 }}>
                  Editar documento
                </h2>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    fontWeight: adminTokens.typography.fontWeight.bold,
                  }}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={salvarEdicao}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: adminTokens.spacing.lg,
                    marginBottom: adminTokens.spacing.lg,
                  }}
                >
                  <select
                    value={tipoPessoa}
                    onChange={(e) => setTipoPessoa(e.target.value as TipoPessoa)}
                    style={inputStyle}
                  >
                    {TIPOS_PESSOA.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={categoria}
                    onChange={(e) =>
                      setCategoria(e.target.value as CategoriaDocumento)
                    }
                    style={inputStyle}
                  >
                    {CATEGORIAS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: adminTokens.spacing.lg }}>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    style={inputStyle}
                    placeholder="Título"
                  />
                </div>

                <div style={{ marginBottom: adminTokens.spacing.lg }}>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                    placeholder="Descrição"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 160px",
                    gap: adminTokens.spacing.lg,
                    marginBottom: adminTokens.spacing.sm * 2,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    value={ordem}
                    onChange={(e) => setOrdem(Number(e.target.value))}
                    style={inputStyle}
                    min={1}
                    placeholder="Ordem"
                  />

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: adminTokens.spacing.md,
                      fontWeight: adminTokens.typography.fontWeight.bold,
                      color: "#14532d",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                    />
                    Ativo
                  </label>
                </div>

                <div style={{ display: "flex", gap: adminTokens.spacing.md, flexWrap: "wrap" }}>
                  <button type="submit" style={btnGreen} disabled={saving}>
                    Salvar alterações
                  </button>
                  <button
                    type="button"
                    style={btnDark}
                    onClick={() => {
                      limparEdicao();
                      setEditOpen(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ ...cardStyle, marginTop: adminTokens.spacing.xl }}>
            <p style={{ margin: 0, color: "#475569" }}>Carregando documentos...</p>
          </div>
        ) : (
          <>
            {renderListaPorTipo("pessoa_juridica", agrupados.pessoa_juridica)}
            {renderListaPorTipo("osc", agrupados.osc)}
            {renderListaPorTipo("pessoa_fisica", agrupados.pessoa_fisica)}
          </>
        )}
      </div>
    </main>
  );
}