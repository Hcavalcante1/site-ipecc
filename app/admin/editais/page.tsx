"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { adminStorageUpload } from "@/lib/admin/storageUploadClient";
import { adminTokens } from "@/components/admin";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";
import {
  isEditalFaseRascunho,
  MSG_EXCLUSAO_SOMENTE_RASCUNHO,
  MSG_REVERTER_RASCUNHO_BLOQUEADO,
} from "@/lib/editais/governancaRules";
import {
  TIPOS_EDITAL_ADMIN,
  TIPO_EDITAL_PADRAO,
} from "@/lib/editais/tiposAdmin";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

// Normaliza nome do arquivo para storage
function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

const h2CadastradosStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base + adminTokens.spacing.xl,
};

const cardListaStyle: CSSProperties = {
  marginTop: adminTokens.spacing.md,
};

const acoesRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: adminTokens.spacing.md,
  marginTop: adminTokens.spacing.md,
};

const excluirBtnStyle: CSSProperties = {
  background: adminTokens.colors.error.background,
  color: adminTokens.colors.error.text,
};

const FASE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  recebimento_propostas: "Recebimento de propostas",
  analise: "Analise tecnica",
  resultado_preliminar: "Resultado preliminar",
  recurso: "Recursos",
  julgamento_recurso: "Julgamento dos recursos",
  resultado_final: "Resultado final",
  homologado: "Homologacao",
  adjudicado: "Adjudicacao",
  contratado: "Contrato / termo",
  execucao: "Execucao",
  prestacao_contas: "Prestacao de contas",
  encerrado: "Encerramento",
};

function labelFase(valor?: string | null) {
  if (!valor) return "Rascunho";
  return FASE_LABELS[valor] || valor.replace(/_/g, " ");
}

type ResumoPropostasEdital = {
  aprovadas: number;
  pendentes: number;
  rejeitadas: number;
};

export default function AdminEditais() {
  const escopo = useAdminEscopoCliente();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState<string>(TIPO_EDITAL_PADRAO);
  const [processoId, setProcessoId] = useState("");
  const [processos, setProcessos] = useState<{ id: string; titulo: string }[]>([]);

  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "em_breve"
  );

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [voltandoRascunhoId, setVoltandoRascunhoId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [editais, setEditais] = useState<any[]>([]);
  const [resumoPropostasPorEdital, setResumoPropostasPorEdital] = useState<
    Record<string, ResumoPropostasEdital>
  >({});

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
    void carregarProcessos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  async function carregarProcessos() {
    const { data, error } = await supabase
      .from("processos_contratacao")
      .select("id, titulo")
      .eq("status", "ativo")
      .order("titulo", { ascending: true });

    if (error) {
      setProcessos([]);
      return;
    }

    let lista = (data || []) as { id: string; titulo: string }[];
    if (escopo.processoIds !== "todos") {
      lista = lista.filter((p) => escopo.processoIds.includes(p.id));
    }
    setProcessos(lista);
    if (lista.length === 1) {
      setProcessoId(lista[0].id);
    }
  }

  async function carregar() {
    const [editaisRes, propostasRes] = await Promise.all([
      supabase.from("editais").select("*").order("created_at", { ascending: false }),
      supabase
        .from("propostas")
        .select("edital_id, status")
        .not("edital_id", "is", null),
    ]);

    if (editaisRes.error) {
      console.error("ERRO AO CARREGAR:", editaisRes.error);
      return;
    }

    const editaisFiltrados = ((editaisRes.data || []) as any[]).filter((edital) =>
      registroNoEscopoProcesso(edital.processo_id, escopo.processoIds)
    );
    const idsVisiveis = new Set(editaisFiltrados.map((e) => e.id as string));

    const resumo: Record<string, ResumoPropostasEdital> = {};
    for (const proposta of propostasRes.data || []) {
      const editalId = proposta.edital_id as string;
      if (!editalId || !idsVisiveis.has(editalId)) continue;

      if (!resumo[editalId]) {
        resumo[editalId] = { aprovadas: 0, pendentes: 0, rejeitadas: 0 };
      }

      const status = proposta.status || "pendente";
      if (status === "aprovado") resumo[editalId].aprovadas += 1;
      else if (status === "rejeitado") resumo[editalId].rejeitadas += 1;
      else resumo[editalId].pendentes += 1;
    }

    setEditais(editaisFiltrados);
    setResumoPropostasPorEdital(resumo);
  }

  async function salvarEdital() {
    setLoading(true);
    setMsg("");

    try {
      if (!titulo.trim()) {
        setMsg("Preencha o titulo do edital.");
        setLoading(false);
        return;
      }

      if (!descricao.trim()) {
        setMsg("Preencha a descricao do edital.");
        setLoading(false);
        return;
      }

      if (!periodo.trim()) {
        setMsg("Preencha o periodo do edital.");
        setLoading(false);
        return;
      }

      if (!arquivo) {
        setMsg("Selecione o arquivo PDF do edital.");
        setLoading(false);
        return;
      }

      if (!processoId) {
        setMsg("Selecione o processo (pasta) deste edital.");
        setLoading(false);
        return;
      }

      if (
        escopo.processoIds !== "todos" &&
        !escopo.processoIds.includes(processoId)
      ) {
        setMsg("Você não tem escopo neste processo.");
        setLoading(false);
        return;
      }

      const nomeSeguro = normalizarNomeArquivo(arquivo.name);
      const nomeArquivoEdital = `${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await adminStorageUpload(
        "editais",
        nomeArquivoEdital,
        arquivo,
        {
          upsert: true,
          contentType: "application/pdf",
        }
      );

      if (uploadError) {
        console.error("UPLOAD PDF:", uploadError);
        setMsg(`Erro ao enviar PDF: ${uploadError.message}`);
        return;
      }

      const { error } = await supabase.from("editais").insert({
        titulo,
        descricao,
        periodo,
        periodo_envio: periodo,
        tipo,
        status,
        ativo: true,
        fase_atual: "rascunho",
        arquivo_pdf: nomeArquivoEdital,
        processo_id: processoId,
      });

      if (error) {
        console.error("INSERT:", error);
        setMsg(`Erro ao salvar edital: ${error.message}`);
        return;
      }

      setMsg("Edital salvo com sucesso.");
      setTitulo("");
      setDescricao("");
      setPeriodo("");
      setTipo(TIPO_EDITAL_PADRAO);
      setStatus("em_breve");
      setArquivo(null);
      if (processos.length !== 1) setProcessoId("");

      await carregar();
    } catch (error) {
      console.error("ERRO AO SALVAR EDITAL:", error);
      setMsg("Erro inesperado ao salvar edital.");
    } finally {
      setLoading(false);
    }
  }

  async function excluirEditalCadastrado(
    id: string,
    titulo?: string,
    faseAtual?: string | null
  ) {
    if (!isEditalFaseRascunho(faseAtual)) {
      setMsg(MSG_EXCLUSAO_SOMENTE_RASCUNHO);
      triggerToast(MSG_EXCLUSAO_SOMENTE_RASCUNHO, "error");
      return;
    }

    const resumo = resumoPropostasPorEdital[id];
    const totalVinculadas = resumo
      ? resumo.aprovadas + resumo.pendentes + resumo.rejeitadas
      : 0;
    const avisoVinculos =
      totalVinculadas > 0
        ? ` ${totalVinculadas} proposta(s) vinculada(s) serao desvinculadas, mas permanecem em Admin > Propostas para auditoria de testes.`
        : "";

    const confirmado = await confirmAction(
      `Deseja excluir este edital de teste (fase Rascunho)${titulo ? `: "${titulo}"` : ""}?${avisoVinculos}`
    );
    if (!confirmado) {
      if (!isConfirmModalReady()) {
        const fallback = window.confirm(
          `Deseja excluir este edital${titulo ? `: "${titulo}"` : ""}?${avisoVinculos}`
        );
        if (!fallback) return;
      } else {
        return;
      }
    }

    setExcluindoId(id);
    setMsg("");

    try {
      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "editais",
          action: "delete",
          filters: [{ column: "id", value: id }],
          select: "id",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        const erro = json.error || "Erro ao excluir edital.";
        setMsg(erro);
        triggerToast(erro, "error");
        return;
      }

      setEditais((atuais) => atuais.filter((edital) => edital.id !== id));
      setMsg("Edital excluido com sucesso.");
      triggerToast("Edital excluido com sucesso.", "success");
      await carregar();
    } catch (error) {
      console.error("ERRO AO EXCLUIR:", error);
      setMsg("Erro inesperado ao excluir edital.");
      triggerToast("Erro inesperado ao excluir edital.", "error");
    } finally {
      setExcluindoId(null);
    }
  }

  async function voltarEditalParaRascunho(id: string, titulo?: string) {
    const resumo = resumoPropostasPorEdital[id];
    if (resumo?.aprovadas) {
      setMsg(MSG_REVERTER_RASCUNHO_BLOQUEADO);
      triggerToast(MSG_REVERTER_RASCUNHO_BLOQUEADO, "error");
      return;
    }

    const confirmado = await confirmAction(
      `Voltar o edital${titulo ? ` "${titulo}"` : ""} para fase Rascunho? Isso habilita a exclusão de testes e remove o edital do site público.`
    );
    if (!confirmado) {
      if (!isConfirmModalReady()) {
        if (
          !window.confirm(
            `Voltar o edital${titulo ? ` "${titulo}"` : ""} para fase Rascunho?`
          )
        ) {
          return;
        }
      } else {
        return;
      }
    }

    setVoltandoRascunhoId(id);
    setMsg("");

    try {
      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "editais",
          action: "update",
          payload: {
            fase_atual: "rascunho",
            status: "em_breve",
          },
          filters: [{ column: "id", value: id }],
          select: "id",
          single: true,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        const erro = json.error || "Erro ao voltar edital para Rascunho.";
        setMsg(erro);
        triggerToast(erro, "error");
        return;
      }

      setMsg("Edital voltou para fase Rascunho. Agora você pode excluir.");
      triggerToast("Edital em Rascunho — exclusão liberada.", "success");
      await carregar();
    } catch (error) {
      console.error("ERRO AO VOLTAR RASCUNHO:", error);
      setMsg("Erro inesperado ao alterar a fase.");
      triggerToast("Erro inesperado ao alterar a fase.", "error");
    } finally {
      setVoltandoRascunhoId(null);
    }
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editais e Chamadas Públicas</h1>

      <p className="admin-subtitle">
        Cadastre aqui a abertura oficial do edital e o PDF publicado em /editais.
        As fases posteriores de seleção, recurso, homologação e contrato são
        registradas na área de Transparência.
      </p>
      <p className="admin-subtitle" style={{ marginTop: 8 }}>
        <strong>Fluxo fechado:</strong> novos editais nascem em <strong>Rascunho</strong> (nao
        aparecem em /editais). Para testar envio de propostas, mantenha Rascunho e altere o
        status para <strong>Aberto</strong>. Ao avancar a fase na governanca, o edital vira
        processo real: <strong>Excluir</strong> e bloqueado e o registro permanece para auditoria.
      </p>
      <p className="admin-subtitle" style={{ marginTop: 8 }}>
        <Link href={adminCanonicalRoutes.editaisCms.hub}>
          Editar textos da página pública Editais →
        </Link>
        {" · "}
        <Link href="/admin/editais/tipos">Tipos de documento (criar ata, declaração…) →</Link>
      </p>

      <h2 className="admin-h2">Cadastrar novo edital</h2>

      <form className="admin-card">
        <label>Título do edital</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Descrição / Texto do edital</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
        />

        <label>Período</label>
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ex: 01/01/2025 a 31/01/2025"
        />

        <label>Tipo / modalidade</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_EDITAL_ADMIN.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>

        <label>Processo (pasta)</label>
        {processos.length === 1 ? (
          <p style={{ marginTop: 4, marginBottom: 8, color: "#e2e8f0" }}>
            {processos[0].titulo}
            <span style={{ display: "block", fontSize: 13, color: "#94a3b8" }}>
              Vinculado automaticamente ao seu processo.
            </span>
          </p>
        ) : (
          <select
            value={processoId}
            onChange={(e) => setProcessoId(e.target.value)}
          >
            <option value="">Selecione o processo</option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        )}
        {processos.length === 0 && !escopo.loading ? (
          <p style={{ marginTop: 8, fontSize: 13, color: "#fbbf24" }}>
            Nenhum processo ativo no seu escopo. Crie em Admin → Processos (mestre)
            ou peca vinculo em Acessos.
          </p>
        ) : null}

        <label>Status</label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "aberto" | "encerrado" | "em_breve")
          }
        >
          <option value="em_breve">Em breve (padrao — sem envio de proposta)</option>
          <option value="aberto">Aberto (habilita testes em /propostas enquanto Rascunho)</option>
          <option value="encerrado">Encerrado</option>
        </select>
        <p style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
          Em fase Rascunho, so o status <strong>Aberto</strong> libera o edital no formulario de
          propostas (ambiente de teste). No processo real, use a governanca para fase{" "}
          <strong>Recebimento de propostas</strong>.
        </p>

        <label>Arquivo do edital (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />

        {msg && <p>{msg}</p>}

        <button
          type="button"
          className="admin-button"
          disabled={loading}
          onClick={salvarEdital}
        >
          {loading ? "Salvando..." : "Salvar edital"}
        </button>
      </form>

      <h2 className="admin-h2" style={h2CadastradosStyle}>
        Editais cadastrados
      </h2>

      {editais.map((e) => (
        <div key={e.id} className="admin-card" style={cardListaStyle}>
          <strong>{e.titulo}</strong>

          {e.descricao && <p>{e.descricao}</p>}

          <p><strong>Tipo:</strong> {e.tipo}</p>
          <p>
            <strong>Processo:</strong>{" "}
            {processos.find((p) => p.id === e.processo_id)?.titulo ||
              (e.processo_id ? "Vinculado" : "Sem processo")}
          </p>
          <p><strong>Período:</strong> {e.periodo || "-"}</p>
          <p><strong>Status:</strong> {e.status}</p>
          <p>
            <strong>Fase de governanca:</strong>{" "}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "4px 10px",
                background:
                  e.fase_atual === "rascunho"
                    ? "rgba(245,158,11,.18)"
                    : "rgba(34,197,94,.16)",
                color:
                  e.fase_atual === "rascunho"
                    ? "#facc15"
                    : "#86efac",
                fontWeight: 800,
              }}
            >
              {labelFase(e.fase_atual)}
            </span>
          </p>

          {resumoPropostasPorEdital[e.id] && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
              <strong>Propostas vinculadas:</strong>{" "}
              {resumoPropostasPorEdital[e.id].aprovadas} aprovada(s),{" "}
              {resumoPropostasPorEdital[e.id].pendentes} pendente(s),{" "}
              {resumoPropostasPorEdital[e.id].rejeitadas} rejeitada(s).
              {!isEditalFaseRascunho(e.fase_atual)
                ? " Exclusao bloqueada fora da fase Rascunho."
                : " Exclusao permitida (fase Rascunho)."}
            </p>
          )}

          <div style={acoesRowStyle}>
            
            {/* 🟡 EDITAR */}
            <Link
              className="admin-button"
              style={{ background: "#eab308", color: "#000", textDecoration: "none" }}
              href={adminCanonicalRoutes.editaisCadastro.editar(e.id)}
            >
              Editar
            </Link>

            <Link
              className="admin-button"
              style={{ background: "#0ea5e9", color: "#fff", textDecoration: "none" }}
              href={`/admin/editais/${e.id}/governanca`}
            >
              Governança / fases
            </Link>

              {!isEditalFaseRascunho(e.fase_atual) &&
                (resumoPropostasPorEdital[e.id]?.aprovadas ?? 0) === 0 && (
              <button
                type="button"
                className="admin-button"
                style={{ background: "#64748b", color: "#fff" }}
                disabled={voltandoRascunhoId === e.id}
                onClick={() => voltarEditalParaRascunho(e.id, e.titulo)}
              >
                {voltandoRascunhoId === e.id ? "Voltando..." : "Voltar p/ Rascunho"}
              </button>
            )}

            {!isEditalFaseRascunho(e.fase_atual) &&
              (resumoPropostasPorEdital[e.id]?.aprovadas ?? 0) > 0 && (
              <span style={{ fontSize: 13, color: "#94a3b8", alignSelf: "center" }}>
                Voltar p/ Rascunho indisponivel (proposta aprovada).
              </span>
            )}

            {/* 🔴 EXCLUIR */}
            <button
              type="button"
              className="admin-button"
              style={{
                ...excluirBtnStyle,
                opacity: !isEditalFaseRascunho(e.fase_atual) ? 0.55 : 1,
              }}
              disabled={excluindoId === e.id || !isEditalFaseRascunho(e.fase_atual)}
              title={
                !isEditalFaseRascunho(e.fase_atual)
                  ? "Exclusao permitida apenas na fase Rascunho (testes)"
                  : undefined
              }
              onClick={() => excluirEditalCadastrado(e.id, e.titulo, e.fase_atual)}
            >
              {excluindoId === e.id ? "Excluindo..." : "Excluir"}
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}
