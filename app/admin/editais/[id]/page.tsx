"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import {
  getFasesGovernancaAdmin,
  labelFaseAdmin,
  sincronizarFaseComModalidade,
} from "@/lib/editais/fasesAdmin";
import { isEditalFaseRascunho } from "@/lib/editais/governancaRules";
import {
  TIPOS_EDITAL_ADMIN,
  TIPO_EDITAL_PADRAO,
} from "@/lib/editais/tiposAdmin";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import {
  carregarProcessosDoEscopo,
  type ProcessoOpcao,
} from "@/lib/auth/processosEscopoCliente";

export default function EditarEdital() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const escopo = useAdminEscopoCliente();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState<string>(TIPO_EDITAL_PADRAO);
  const [faseAtual, setFaseAtual] = useState("rascunho");
  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "em_breve"
  );
  const [processoId, setProcessoId] = useState("");
  const [processos, setProcessos] = useState<ProcessoOpcao[]>([]);
  const [bloqueado, setBloqueado] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (escopo.loading || !id) return;

    async function carregar() {
      const [dataRes, listaProcessos] = await Promise.all([
        supabase.from("editais").select("*").eq("id", id).single(),
        carregarProcessosDoEscopo(escopo.processoIds),
      ]);

      setProcessos(listaProcessos);

      const data = dataRes.data;
      if (data) {
        if (!registroNoEscopoProcesso(data.processo_id, escopo.processoIds)) {
          setBloqueado(true);
          setLoading(false);
          return;
        }

        setTitulo(data.titulo || "");
        setDescricao(data.descricao || "");
        setPeriodo(data.periodo || "");
        setTipo(data.tipo || TIPO_EDITAL_PADRAO);
        setFaseAtual(data.fase_atual || "rascunho");
        setStatus(data.status || "em_breve");
        setProcessoId(data.processo_id || "");
      }

      setLoading(false);
    }

    void carregar();
  }, [id, escopo.loading, escopo.processoIds]);

  async function salvarEditalCadastrado() {
    setSalvando(true);
    setMsg("");

    try {
      if (!id) {
        setMsg("Edital não identificado.");
        triggerToast("Edital não identificado.", "error");
        return;
      }

      if (!titulo.trim()) {
        setMsg("Preencha o titulo do edital.");
        return;
      }

      if (!descricao.trim()) {
        setMsg("Preencha a descricao do edital.");
        return;
      }

      if (!periodo.trim()) {
        setMsg("Preencha o periodo do edital.");
        return;
      }

      if (!processoId) {
        setMsg("Selecione o processo (pasta) deste edital.");
        return;
      }

      if (
        escopo.processoIds !== "todos" &&
        !escopo.processoIds.includes(processoId)
      ) {
        setMsg("Você não tem escopo neste processo.");
        return;
      }

      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "editais",
          action: "update",
          payload: {
            titulo,
            descricao,
            periodo,
            periodo_envio: periodo,
            tipo,
            status,
            fase_atual: faseAtual,
            processo_id: processoId,
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
        const erro = json.error || "Erro ao atualizar edital.";
        setMsg(`Erro ao atualizar edital: ${erro}`);
        triggerToast(erro, "error");
        return;
      }

      setMsg("Edital atualizado com sucesso.");
      triggerToast("Edital atualizado com sucesso.", "success");
      router.push("/admin/editais");
    } catch (error) {
      console.error(error);
      setMsg("Erro inesperado ao atualizar edital.");
      triggerToast("Erro inesperado ao atualizar edital.", "error");
    } finally {
      setSalvando(false);
    }
  }

  if (loading || escopo.loading) return <p style={{ padding: 20 }}>Carregando...</p>;

  if (bloqueado) {
    return (
      <div className="admin-box">
        <h1 className="admin-h1">Acesso negado</h1>
        <p className="admin-subtitle">
          Este edital esta fora do seu escopo de processo.
        </p>
        <button
          type="button"
          className="admin-button"
          onClick={() => router.push("/admin/editais")}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editar Edital</h1>
      <p className="admin-subtitle">
        Para excluir editais de teste, defina a fase como <strong>Rascunho</strong> e salve.
        Depois use o botao Excluir na listagem.
      </p>

      <div className="admin-card">
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
        />

        <label>Tipo / modalidade</label>
        <select
          value={tipo}
          onChange={(e) => {
            const novoTipo = e.target.value;
            setTipo(novoTipo);
            setFaseAtual((atual) =>
              sincronizarFaseComModalidade(atual, novoTipo)
            );
          }}
        >
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

        <label>Fase de governanca</label>
        <select
          value={
            getFasesGovernancaAdmin(tipo).includes(faseAtual)
              ? faseAtual
              : sincronizarFaseComModalidade(faseAtual, tipo)
          }
          onChange={(e) => setFaseAtual(e.target.value)}
        >
          {getFasesGovernancaAdmin(tipo).map((fase) => (
            <option key={fase} value={fase}>
              {labelFaseAdmin(fase, tipo)}
            </option>
          ))}
        </select>
        <p style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
          {isEditalFaseRascunho(faseAtual)
            ? "Fase Rascunho: edital de teste — exclusão permitida na listagem."
            : "Fora de Rascunho: processo institucional — exclusão bloqueada na listagem."}
        </p>

        <label>Status</label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "aberto" | "encerrado" | "em_breve")
          }
        >
          <option value="em_breve">Em breve</option>
          <option value="aberto">Aberto (testes em /propostas se Rascunho)</option>
          <option value="encerrado">Encerrado</option>
        </select>

        {msg && <p>{msg}</p>}

        <button
          type="button"
          className="admin-button"
          onClick={salvarEditalCadastrado}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
