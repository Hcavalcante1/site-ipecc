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

export default function EditarEdital() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState<string>(TIPO_EDITAL_PADRAO);
  const [faseAtual, setFaseAtual] = useState("rascunho");
  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "em_breve"
  );

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function carregar() {
      if (!id) return;

      const { data } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setTitulo(data.titulo || "");
        setDescricao(data.descricao || "");
        setPeriodo(data.periodo || "");
        setTipo(data.tipo || TIPO_EDITAL_PADRAO);
        setFaseAtual(data.fase_atual || "rascunho");
        setStatus(data.status || "em_breve");
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  async function salvarEditalCadastrado() {
    setSalvando(true);
    setMsg("");

    try {
      if (!id) {
        setMsg("Edital nao identificado.");
        triggerToast("Edital nao identificado.", "error");
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

  if (loading) return <p style={{ padding: 20 }}>Carregando...</p>;

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
            ? "Fase Rascunho: edital de teste — exclusao permitida na listagem."
            : "Fora de Rascunho: processo institucional — exclusao bloqueada na listagem."}
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
