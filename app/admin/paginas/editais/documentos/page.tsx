"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
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
  tipo_pessoa?: TipoPessoa | string | null;
  categoria?: CategoriaDocumento | string | null;
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

export default function EditaisDocumentosAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [documentos, setDocumentos] = useState<Documento[]>([]);

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pessoa_juridica");
  const [categoria, setCategoria] =
    useState<CategoriaDocumento>("habilitacao_juridica");

  const [documentoOficial, setDocumentoOficial] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const modelosAtuais = useMemo(() => {
    return MODELOS_DOCUMENTOS[tipoPessoa][categoria] || [];
  }, [tipoPessoa, categoria]);

  const agrupados = useMemo(() => {
    return {
      pessoa_juridica: documentos.filter(
        (d) => d.tipo_pessoa === "pessoa_juridica"
      ),
      osc: documentos.filter((d) => d.tipo_pessoa === "osc"),
      pessoa_fisica: documentos.filter(
        (d) => d.tipo_pessoa === "pessoa_fisica"
      ),
    };
  }, [documentos]);

  useEffect(() => {
    setDocumentoOficial("");
  }, [tipoPessoa, categoria]);

  async function carregarDados() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("editais_documentos")
      .select("*")
      .eq("pagina_slug", "editais")
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

  function limparFormulario() {
    setEditId(null);
    setTitulo("");
    setDescricao("");
    setOrdem(1);
    setAtivo(true);
  }

  function preencherDocumentoOficial(valor: string) {
    setDocumentoOficial(valor);

    const doc = modelosAtuais.find((item) => item.titulo === valor);
    if (!doc) return;

    setTitulo(doc.titulo);
    setDescricao(doc.descricao);
  }

  async function adicionarDocumentoOficial() {
    if (!documentoOficial) {
      setMsg("Selecione um documento oficial.");
      return;
    }

    const doc = modelosAtuais.find((item) => item.titulo === documentoOficial);

    if (!doc) {
      setMsg("Documento oficial não encontrado.");
      return;
    }

    const existentes = documentos.filter(
      (d) =>
        d.tipo_pessoa === tipoPessoa &&
        d.categoria === categoria &&
        d.titulo === doc.titulo
    );

    if (existentes.length > 0) {
      setMsg("Este documento já foi cadastrado nesta categoria.");
      return;
    }

    setSaving(true);
    setMsg("");

    const ordemBase =
      documentos.filter(
        (d) => d.tipo_pessoa === tipoPessoa && d.categoria === categoria
      ).length + 1;

    const { error } = await supabase.from("editais_documentos").insert({
      pagina_slug: "editais",
      tipo_pessoa: tipoPessoa,
      categoria,
      titulo: doc.titulo,
      descricao: doc.descricao,
      ordem: ordemBase,
      ativo: true,
    });

    if (error) {
      setMsg("Erro ao cadastrar documento oficial.");
      setSaving(false);
      return;
    }

    setMsg("Documento oficial cadastrado com sucesso.");
    setDocumentoOficial("");
    await carregarDados();
    setSaving(false);
  }

  async function salvarManual(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const payload: Documento = {
      pagina_slug: "editais",
      tipo_pessoa: tipoPessoa,
      categoria,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      ordem: Number(ordem) || 1,
      ativo,
    };

    if (!payload.titulo) {
      setMsg("Informe o título do documento.");
      setSaving(false);
      return;
    }

    let error = null;

    if (editId) {
      const resp = await supabase
        .from("editais_documentos")
        .update(payload)
        .eq("id", editId);

      error = resp.error;
    } else {
      const resp = await supabase.from("editais_documentos").insert(payload);
      error = resp.error;
    }

    if (error) {
      setMsg("Erro ao salvar documento.");
      setSaving(false);
      return;
    }

    setMsg(
      editId
        ? "Documento atualizado com sucesso."
        : "Documento salvo com sucesso."
    );
    limparFormulario();
    await carregarDados();
    setSaving(false);
  }

  function editarItem(item: Documento) {
    setEditId(item.id || null);
    setTipoPessoa((item.tipo_pessoa as TipoPessoa) || "pessoa_juridica");
    setCategoria(
      (item.categoria as CategoriaDocumento) || "habilitacao_juridica"
    );
    setTitulo(item.titulo);
    setDescricao(item.descricao || "");
    setOrdem(item.ordem || 1);
    setAtivo(!!item.ativo);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function renderListaPorTipo(tipo: TipoPessoa, itens: Documento[]) {
    return (
      <div className="admin-card" style={{ marginTop: 20 }}>
        <h3
          style={{
            marginTop: 0,
            marginBottom: 14,
            color: "#22c55e",
            fontSize: "30px",
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {LABEL_TIPO_PESSOA[tipo]}
        </h3>

        {!itens.length ? (
          <p style={{ margin: 0 }}>Nenhum documento cadastrado.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {CATEGORIAS.map((cat) => {
              const filtrados = itens.filter(
                (item) =>
                  item.tipo_pessoa === tipo && item.categoria === cat.value
              );

              if (!filtrados.length) return null;

              return (
                <div
                  key={`${tipo}-${cat.value}`}
                  style={{
                    border: "1px solid #dbe7dc",
                    borderRadius: 14,
                    padding: 14,
                    background: "transparent",
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: 14,
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#22c55e",
                      lineHeight: 1.15,
                      letterSpacing: "-0.2px",
                      textShadow: "0 0 1px rgba(0,0,0,0.25)",
                    }}
                  >
                    {LABEL_CATEGORIA[cat.value]}
                  </h4>

                  <div style={{ display: "grid", gap: 0 }}>
                    {filtrados.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 0",
                          borderTop:
                            index === 0 ? "none" : "1px solid #dbe7dc",
                          background: "transparent",
                        }}
                      >
                        <strong>{item.titulo}</strong>

                        {item.descricao && (
                          <p style={{ marginTop: 8, marginBottom: 0 }}>
                            {item.descricao}
                          </p>
                        )}

                        <p style={{ marginTop: 8, marginBottom: 0 }}>
                          <strong>Ordem:</strong> {item.ordem || 0}
                        </p>

                        <p style={{ marginTop: 4, marginBottom: 0 }}>
                          <strong>Ativo:</strong> {item.ativo ? "Sim" : "Não"}
                        </p>

                        <div
                          style={{ display: "flex", gap: 10, marginTop: 10 }}
                        >
                          <button
                            type="button"
                            className="admin-button"
                            style={{ background: "#eab308", color: "#000" }}
                            onClick={() => editarItem(item)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="admin-button"
                            style={{ background: "#ef4444", color: "#fff" }}
                            onClick={() => excluirItem(item.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Documentação exigida para participação</h1>

      <p className="admin-subtitle" style={{ maxWidth: 900 }}>
        Para participar dos editais e chamadas públicas, as organizações
        interessadas deverão apresentar documentação institucional obrigatória
        no momento do envio da proposta.
      </p>

      {msg ? (
        <div
          style={{
            marginTop: 16,
            marginBottom: 20,
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: "12px 14px",
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      ) : null}

      <h2 className="admin-h2">Cadastrar documento oficial</h2>

      <div className="admin-card">
        <label>Tipo de pessoa</label>
        <select
          value={tipoPessoa}
          onChange={(e) => setTipoPessoa(e.target.value as TipoPessoa)}
        >
          {TIPOS_PESSOA.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label>Categoria</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
        >
          {CATEGORIAS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label>Documento oficial</label>
        <select
          value={documentoOficial}
          onChange={(e) => preencherDocumentoOficial(e.target.value)}
        >
          <option value="">Selecione um documento oficial</option>
          {modelosAtuais.map((item) => (
            <option key={item.titulo} value={item.titulo}>
              {item.titulo}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="admin-button"
          disabled={saving}
          onClick={adicionarDocumentoOficial}
          style={{ marginTop: 14 }}
        >
          {saving ? "Salvando..." : "Cadastrar documento oficial"}
        </button>
      </div>

      <h2 className="admin-h2" style={{ marginTop: 30 }}>
        Cadastro manual / edição
      </h2>

      <form onSubmit={salvarManual} className="admin-card">
        <label>Tipo de pessoa</label>
        <select
          value={tipoPessoa}
          onChange={(e) => setTipoPessoa(e.target.value as TipoPessoa)}
        >
          {TIPOS_PESSOA.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label>Categoria</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
        >
          {CATEGORIAS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label>Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Digite o título do documento"
        />

        <label>Descrição</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          placeholder="Digite a descrição do documento"
        />

        <label>Ordem</label>
        <input
          type="number"
          value={ordem}
          onChange={(e) => setOrdem(Number(e.target.value))}
          min={1}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Ativo
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="admin-button" disabled={saving}>
            {saving
              ? "Salvando..."
              : editId
              ? "Salvar alterações"
              : "Salvar documento"}
          </button>

          <button
            type="button"
            className="admin-button"
            onClick={limparFormulario}
          >
            Limpar formulário
          </button>
        </div>
      </form>

      <h2 className="admin-h2" style={{ marginTop: 30 }}>
        Documentos organizados por grupo
      </h2>

      {loading ? (
        <div className="admin-card">Carregando documentos...</div>
      ) : (
        <>
          {renderListaPorTipo("pessoa_juridica", agrupados.pessoa_juridica)}
          {renderListaPorTipo("osc", agrupados.osc)}
          {renderListaPorTipo("pessoa_fisica", agrupados.pessoa_fisica)}
        </>
      )}
    </div>
  );
}