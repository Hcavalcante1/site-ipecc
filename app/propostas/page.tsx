"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TipoPessoa = "pessoa_juridica" | "osc" | "pessoa_fisica";
type CategoriaDocumento =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica";

type DocumentoUpload = {
  key: string;
  label: string;
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
  habilitacao_juridica: "Habilitação Jurídica",
  regularidade_fiscal_trabalhista: "Regularidade Fiscal e Trabalhista",
  qualificacao_tecnica: "Qualificação Técnica",
};

const DOCUMENTOS_POR_TIPO: Record<
  TipoPessoa,
  Record<CategoriaDocumento, DocumentoUpload[]>
> = {
  pessoa_juridica: {
    habilitacao_juridica: [
      { key: "proposta", label: "Proposta" },
      { key: "contrato_social", label: "Contrato Social / Ato Constitutivo" },
      { key: "doc_representante", label: "Documento do Representante Legal" },
      { key: "procuracao", label: "Procuração, se houver" },
    ],
    regularidade_fiscal_trabalhista: [
      { key: "cnpj", label: "Comprovante de CNPJ" },
      { key: "certidao_federal", label: "Certidão Federal" },
      { key: "certidao_estadual", label: "Certidão Estadual" },
      { key: "certidao_municipal", label: "Certidão Municipal" },
      { key: "fgts", label: "CRF / FGTS" },
      { key: "cndt", label: "CNDT" },
    ],
    qualificacao_tecnica: [
      { key: "atestado_tecnico", label: "Atestado de Capacidade Técnica" },
      { key: "qualificacao_tecnica", label: "Documentos de Qualificação Técnica" },
      { key: "equipe_tecnica", label: "Equipe Técnica / Responsáveis" },
    ],
  },

  osc: {
    habilitacao_juridica: [
      { key: "proposta", label: "Proposta" },
      { key: "estatuto", label: "Estatuto Social" },
      { key: "ata_posse", label: "Ata de Eleição e Posse" },
      { key: "doc_representante", label: "Documento do Representante Legal" },
      { key: "procuracao", label: "Procuração, se houver" },
    ],
    regularidade_fiscal_trabalhista: [
      { key: "cnpj", label: "Comprovante de CNPJ" },
      { key: "certidao_federal", label: "Certidão Federal" },
      { key: "certidao_estadual", label: "Certidão Estadual" },
      { key: "certidao_municipal", label: "Certidão Municipal" },
      { key: "fgts", label: "CRF / FGTS" },
      { key: "cndt", label: "CNDT" },
    ],
    qualificacao_tecnica: [
      { key: "atestado_tecnico", label: "Atestado de Capacidade Técnica" },
      { key: "portfolio", label: "Portfólio / Relatório de Atividades" },
      { key: "equipe_tecnica", label: "Equipe Técnica / Responsáveis" },
    ],
  },

  pessoa_fisica: {
    habilitacao_juridica: [
      { key: "proposta", label: "Proposta" },
      { key: "doc_pessoal", label: "Documento Oficial com Foto" },
      { key: "cpf", label: "CPF" },
      { key: "comprovante_residencia", label: "Comprovante de Residência" },
    ],
    regularidade_fiscal_trabalhista: [
      { key: "certidao_federal", label: "Certidão Federal, se exigida" },
      { key: "certidao_estadual", label: "Certidão Estadual, se exigida" },
      { key: "certidao_municipal", label: "Certidão Municipal, se exigida" },
    ],
    qualificacao_tecnica: [
      { key: "portfolio", label: "Portfólio / Experiência" },
      { key: "formacao", label: "Formação / Certificados" },
      { key: "registro_profissional", label: "Registro Profissional, se houver" },
    ],
  },
};

function UploadItem({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        padding: "10px 14px",
        borderRadius: 12,
      }}
    >
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
        {label}
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
  );
}

export default function PropostasPage() {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pessoa_juridica");
  const [categoria, setCategoria] =
    useState<CategoriaDocumento>("habilitacao_juridica");
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({});
  const [enviando, setEnviando] = useState(false);

  const documentosVisiveis = useMemo(() => {
    return DOCUMENTOS_POR_TIPO[tipoPessoa][categoria] || [];
  }, [tipoPessoa, categoria]);

  function setArquivo(key: string, file: File | null) {
    setArquivos((prev) => ({
      ...prev,
      [key]: file,
    }));
  }

  function limparArquivos() {
    setArquivos({});
  }

  async function uploadArquivo(file: File, tipoArquivo: string) {
    const nomeLimpo = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const nome = `${Date.now()}-${tipoArquivo}-${nomeLimpo}`;
   const path = nome;

    const { error } = await supabase.storage.from("propostas").upload(path, file);

    if (error) throw error;

    return nome;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const nome = (form.querySelector("[data-field='nome']") as HTMLInputElement)
      .value;
    const documento = (
      form.querySelector("[data-field='documento']") as HTMLInputElement
    ).value;
    const email = (form.querySelector("[data-field='email']") as HTMLInputElement)
      .value;
    const telefone = (
      form.querySelector("[data-field='telefone']") as HTMLInputElement
    ).value;
    const mensagemBase = (
      form.querySelector("[data-field='mensagem']") as HTMLTextAreaElement
    ).value;

    const propostaFile = arquivos["proposta"];

    if (!propostaFile) {
      alert("Envie a proposta.");
      return;
    }

    try {
      setEnviando(true);

      const arquivo_url = await uploadArquivo(propostaFile, "proposta");

      const arquivosEnviados: Record<string, string> = {};

      for (const doc of documentosVisiveis) {
        const file = arquivos[doc.key];
        if (!file || doc.key === "proposta") continue;
        arquivosEnviados[doc.key] = await uploadArquivo(file, doc.key);
      }

      const resumoAnexos = Object.entries(arquivosEnviados)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ");

      const mensagemFinal = [
        mensagemBase.trim(),
        "",
        `Tipo de pessoa: ${LABEL_TIPO_PESSOA[tipoPessoa]}`,
        `Categoria: ${LABEL_CATEGORIA[categoria]}`,
        resumoAnexos ? `Anexos enviados: ${resumoAnexos}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const data: any = {
        nome,
        cnpj: documento,
        email,
        telefone,
        mensagem: mensagemFinal,
        tipo: tipoPessoa,
        categoria,
        arquivo_url,
      };

      if (arquivosEnviados["cnpj"]) data.cnpj_url = arquivosEnviados["cnpj"];
      if (arquivosEnviados["contrato_social"]) {
        data.contrato_social_url = arquivosEnviados["contrato_social"];
      }
      if (arquivosEnviados["estatuto"]) {
        data.estatuto_url = arquivosEnviados["estatuto"];
      }
      if (arquivosEnviados["ata_posse"]) {
        data.ata_posse_url = arquivosEnviados["ata_posse"];
      }
      if (arquivosEnviados["doc_pessoal"]) {
        data.doc_pessoal_url = arquivosEnviados["doc_pessoal"];
      }
      if (arquivosEnviados["doc_representante"]) {
        data.doc_representante_url = arquivosEnviados["doc_representante"];
      }
      if (arquivosEnviados["procuracao"]) {
        data.procuracao_url = arquivosEnviados["procuracao"];
      }
      if (arquivosEnviados["certidao_federal"]) {
        data.certidao_federal_url = arquivosEnviados["certidao_federal"];
      }
      if (arquivosEnviados["certidao_estadual"]) {
        data.certidao_estadual_url = arquivosEnviados["certidao_estadual"];
      }
      if (arquivosEnviados["certidao_municipal"]) {
        data.certidao_municipal_url = arquivosEnviados["certidao_municipal"];
      }
      if (arquivosEnviados["fgts"]) {
        data.fgts_url = arquivosEnviados["fgts"];
      }
      if (arquivosEnviados["cndt"]) {
        data.cndt_url = arquivosEnviados["cndt"];
      }
      if (arquivosEnviados["atestado_tecnico"]) {
        data.atestado_tecnico_url = arquivosEnviados["atestado_tecnico"];
      }
      if (arquivosEnviados["qualificacao_tecnica"]) {
        data.qualificacao_tecnica_url = arquivosEnviados["qualificacao_tecnica"];
      }
      if (arquivosEnviados["equipe_tecnica"]) {
        data.equipe_tecnica_url = arquivosEnviados["equipe_tecnica"];
      }
      if (arquivosEnviados["portfolio"]) {
        data.portfolio_url = arquivosEnviados["portfolio"];
      }
      if (arquivosEnviados["formacao"]) {
        data.formacao_url = arquivosEnviados["formacao"];
      }
      if (arquivosEnviados["registro_profissional"]) {
        data.registro_profissional_url = arquivosEnviados["registro_profissional"];
      }
      if (arquivosEnviados["comprovante_residencia"]) {
        data.comprovante_residencia_url =
          arquivosEnviados["comprovante_residencia"];
      }
      if (arquivosEnviados["cpf"]) {
        data.cpf_url = arquivosEnviados["cpf"];
      }

      const { error } = await supabase.from("propostas").insert(data);

      if (error) throw error;

      alert("Proposta enviada com sucesso!");
      form.reset();
      limparArquivos();
      setTipoPessoa("pessoa_juridica");
      setCategoria("habilitacao_juridica");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao enviar proposta");
    } finally {
      setEnviando(false);
    }
  }
return (
  <>
    <section className="hero-rolling">
      <div
        className="hero-rolling__inner"
        style={{

          ["--hero-bg-image" as any]:
            'url("/media/heroes/propostas/hero.webp")',
        }}
      >
        <h1 className="hero__title">Enviar Proposta</h1>
        <p className="hero__text">
          Selecione o tipo de pessoa e a categoria documental para enviar apenas os arquivos necessários.
        </p>
      </div>
    </section>

      <section style={{ padding: "0 16px 60px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
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
                Dados da Proponente
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <select
                  value={tipoPessoa}
                  onChange={(e) => {
                    setTipoPessoa(e.target.value as TipoPessoa);
                    setCategoria("habilitacao_juridica");
                    limparArquivos();
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="pessoa_juridica">Pessoa Jurídica</option>
                  <option value="osc">OSC</option>
                  <option value="pessoa_fisica">Pessoa Física</option>
                </select>

                <select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value as CategoriaDocumento);
                    limparArquivos();
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="habilitacao_juridica">
                    Habilitação Jurídica
                  </option>
                  <option value="regularidade_fiscal_trabalhista">
                    Regularidade Fiscal e Trabalhista
                  </option>
                  <option value="qualificacao_tecnica">
                    Qualificação Técnica
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <input
                  data-field="nome"
                  placeholder="Nome da proponente"
                  required
                  style={inputStyle}
                />
                <input
                  data-field="documento"
                  placeholder={tipoPessoa === "pessoa_fisica" ? "CPF" : "CNPJ"}
                  required
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <input
                  data-field="email"
                  placeholder="Email"
                  required
                  style={inputStyle}
                />
                <input
                  data-field="telefone"
                  placeholder="Telefone"
                  required
                  style={inputStyle}
                />
              </div>

              <textarea
                data-field="mensagem"
                placeholder="Mensagem / observações"
                rows={5}
                required
                style={textareaStyle}
              />
            </div>

            <div
              style={{
                background: "linear-gradient(90deg, #0d6efd, #00c6a7)",
                padding: 24,
                borderRadius: 18,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 10,
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {LABEL_TIPO_PESSOA[tipoPessoa]}
              </h3>

              <h4
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  color: "#d1fae5",
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {LABEL_CATEGORIA[categoria]}
              </h4>

              <div style={{ display: "grid", gap: 14 }}>
                {documentosVisiveis.map((doc) => (
                  <UploadItem
                    key={doc.key}
                    label={doc.label}
                    file={arquivos[doc.key] ?? null}
                    onChange={(file) => setArquivo(doc.key, file)}
                  />
                ))}
              </div>

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
                  cursor: "pointer",
                  width: "100%",
                  fontSize: 16,
                }}
              >
                {enviando ? "Enviando..." : "Enviar Proposta"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}