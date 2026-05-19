"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import { spacing, typography, colors } from "@/components/admin";

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
  esfera: string;
  orgao_padrao: string;
  uf: string | null;
  municipio: string | null;
};

const ESFERAS = [
  "federal",
  "estadual",
  "municipal",
  "trabalhista",
  "previdenciario",
  "fiscal",
  "tributario",
  "regulatorio",
  "institucional",
] as const;

const STATUS_OPCOES = [
  "pendente",
  "regular",
  "irregular",
  "positiva",
  "positiva_com_efeito_negativa",
  "vencida",
  "exige_acao_humana",
  "erro_emissao",
] as const;

const STATUS_PROCESSO_OPCOES = [
  "rascunho",
  "solicitada",
  "emitida",
  "anexada",
  "validada",
  "arquivada",
] as const;

function labelCampo(value: string) {
  return value.replace(/_/g, " ");
}

function somenteDigitosCnpj(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function NovaCertidaoPage() {
  const router = useRouter();

  const [tipos, setTipos] = useState<CertidaoTipo[]>([]);
  const [carregandoTipos, setCarregandoTipos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [organizacaoCnpj, setOrganizacaoCnpj] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [orgaoEmissor, setOrgaoEmissor] = useState("");
  const [esfera, setEsfera] = useState("");
  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [numeroCertidao, setNumeroCertidao] = useState("");
  const [codigoAutenticacao, setCodigoAutenticacao] = useState("");
  const [emitidaEm, setEmitidaEm] = useState("");
  const [validadeAte, setValidadeAte] = useState("");
  const [status, setStatus] = useState<string>("pendente");
  const [statusProcesso, setStatusProcesso] = useState<string>("rascunho");
  const [observacoes, setObservacoes] = useState("");
  const [metadataTexto, setMetadataTexto] = useState("");

  useEffect(() => {
    async function carregarTipos() {
      setCarregandoTipos(true);
      const { data, error } = await supabase
        .from("certidao_tipos")
        .select("id, codigo, nome, esfera, orgao_padrao, uf, municipio")
        .eq("ativo", true)
        .order("ordem_exibicao", { ascending: true });

      if (error) {
        setMsg("Erro ao carregar tipos de certidão.");
        setCarregandoTipos(false);
        return;
      }

      setTipos((data || []) as CertidaoTipo[]);
      setCarregandoTipos(false);
    }

    carregarTipos();
  }, []);

  function aoSelecionarTipo(id: string) {
    setTipoId(id);
    const tipo = tipos.find((item) => item.id === id);
    if (!tipo) return;
    setEsfera(tipo.esfera);
    setOrgaoEmissor(tipo.orgao_padrao);
    if (tipo.uf) setUf(tipo.uf);
    if (tipo.municipio) setMunicipio(tipo.municipio);
  }

  function validarFormulario(): string | null {
    const cnpj = somenteDigitosCnpj(organizacaoCnpj);
    if (cnpj.length !== 14) {
      return "CNPJ deve conter exatamente 14 dígitos numéricos.";
    }
    if (!tipoId) return "Selecione o tipo de certidão.";
    if (!orgaoEmissor.trim()) return "Órgão emissor é obrigatório.";
    if (!esfera) return "Esfera é obrigatória.";
    if (!validadeAte) return "Validade até é obrigatória.";
    if (emitidaEm && validadeAte < emitidaEm) {
      return "A validade não pode ser anterior à data de emissão.";
    }

    if (metadataTexto.trim()) {
      try {
        const parsed = JSON.parse(metadataTexto);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return "Metadata deve ser um objeto JSON válido.";
        }
      } catch {
        return "Metadata inválida. Use JSON objeto ou deixe em branco.";
      }
    }

    return null;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setMsg(erroValidacao);
      triggerToast(erroValidacao, "error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMsg("Sessão inválida. Faça login novamente.");
      triggerToast("Sessão inválida. Faça login novamente.", "error");
      return;
    }

    let metadata: Record<string, unknown> = {};
    if (metadataTexto.trim()) {
      metadata = JSON.parse(metadataTexto) as Record<string, unknown>;
    }

    setSalvando(true);

    const payload = {
      organizacao_cnpj: somenteDigitosCnpj(organizacaoCnpj),
      tipo_id: tipoId,
      orgao_emissor: orgaoEmissor.trim(),
      esfera,
      uf: uf.trim() ? uf.trim().toUpperCase().slice(0, 2) : null,
      municipio: municipio.trim() || null,
      numero_certidao: numeroCertidao.trim() || null,
      codigo_autenticacao: codigoAutenticacao.trim() || null,
      emitida_em: emitidaEm || null,
      validade_ate: validadeAte,
      status,
      status_processo: statusProcesso,
      observacoes: observacoes.trim() || null,
      metadata,
      origem: "manual",
      versao: 1,
      certidao_anterior_id: null,
      ativo: true,
      deleted_at: null,
      created_by: user.id,
      updated_by: user.id,
      responsavel_user_id: user.id,
    };

    const { error } = await supabase.from("certidoes").insert(payload);

    setSalvando(false);

    if (error) {
      const texto = error.message || "Erro ao salvar certidão.";
      setMsg(texto);
      triggerToast(texto, "error");
      return;
    }

    triggerToast("Certidão cadastrada com sucesso.", "success");
    router.push("/admin/certidoes");
  }

  return (
    <>
      <h1 className="admin-h1">Nova certidão</h1>
      <p className="admin-subtitle">
        Cadastro manual de metadados. O anexo em PDF será habilitado em etapa
        posterior.
      </p>

      <p style={styles.voltar}>
        <Link href="/admin/certidoes">← Voltar para listagem</Link>
      </p>

      {carregandoTipos && <p style={styles.hint}>Carregando tipos...</p>}

      {!carregandoTipos && (
        <form className="admin-form" onSubmit={salvar}>
          <div>
            <label>CNPJ da organização *</label>
            <input
              className="admin-input"
              value={organizacaoCnpj}
              onChange={(e) => setOrganizacaoCnpj(e.target.value)}
              placeholder="Somente números ou com máscara"
              maxLength={18}
            />
          </div>

          <div>
            <label>Tipo de certidão *</label>
            <select
              className="admin-input"
              value={tipoId}
              onChange={(e) => aoSelecionarTipo(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome} ({tipo.codigo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Órgão emissor *</label>
            <input
              className="admin-input"
              value={orgaoEmissor}
              onChange={(e) => setOrgaoEmissor(e.target.value)}
            />
          </div>

          <div>
            <label>Esfera *</label>
            <select
              className="admin-input"
              value={esfera}
              onChange={(e) => setEsfera(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {ESFERAS.map((item) => (
                <option key={item} value={item}>
                  {labelCampo(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-row">
            <div style={styles.campoMetade}>
              <label>UF</label>
              <input
                className="admin-input"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                maxLength={2}
                placeholder="Ex.: SP"
              />
            </div>
            <div style={styles.campoMetade}>
              <label>Município</label>
              <input
                className="admin-input"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div style={styles.campoMetade}>
              <label>Número da certidão</label>
              <input
                className="admin-input"
                value={numeroCertidao}
                onChange={(e) => setNumeroCertidao(e.target.value)}
              />
            </div>
            <div style={styles.campoMetade}>
              <label>Código de autenticação</label>
              <input
                className="admin-input"
                value={codigoAutenticacao}
                onChange={(e) => setCodigoAutenticacao(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="admin-form-row">
              <div style={styles.campoMetade}>
                <label>Emitida em</label>
                <input
                  type="date"
                  className="admin-input"
                  value={emitidaEm}
                  onChange={(e) => setEmitidaEm(e.target.value)}
                />
              </div>
              <div style={styles.campoMetade}>
                <label>Validade até *</label>
                <input
                  type="date"
                  className="admin-input"
                  value={validadeAte}
                  onChange={(e) => setValidadeAte(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="admin-form-row">
            <div style={styles.campoMetade}>
              <label>Status *</label>
              <select
                className="admin-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPCOES.map((item) => (
                  <option key={item} value={item}>
                    {labelCampo(item)}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.campoMetade}>
              <label>Status do processo</label>
              <select
                className="admin-input"
                value={statusProcesso}
                onChange={(e) => setStatusProcesso(e.target.value)}
              >
                {STATUS_PROCESSO_OPCOES.map((item) => (
                  <option key={item} value={item}>
                    {labelCampo(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label>Observações</label>
            <textarea
              className="admin-textarea"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div>
            <label>Metadata (JSON opcional)</label>
            <textarea
              className="admin-textarea"
              value={metadataTexto}
              onChange={(e) => setMetadataTexto(e.target.value)}
              placeholder='Ex.: {"protocolo":"123"}'
              style={{ minHeight: 80 }}
            />
          </div>

          {msg && <p style={styles.erro}>{msg}</p>}

          <div className="admin-save-row">
            <button
              type="button"
              className="admin-save-button"
              disabled={salvando || carregandoTipos}
              onClick={(e) => {
                e.preventDefault();
                void salvar(e as unknown as FormEvent<HTMLFormElement>);
              }}
            >
              {salvando ? "Salvando..." : "Salvar certidão"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  voltar: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: typography.fontSize.sm,
  },
  hint: {
    marginTop: spacing.lg,
    color: colors.text.secondary,
  },
  campoMetade: {
    flex: "1 1 200px",
    minWidth: 0,
  },
  erro: {
    color: colors.error.text,
    margin: 0,
    fontSize: typography.fontSize.sm,
  },
};
