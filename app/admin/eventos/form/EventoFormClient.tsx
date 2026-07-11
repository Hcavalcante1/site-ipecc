"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import { adminTokens } from "@/components/admin";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import {
  carregarProcessosDoEscopo,
  type ProcessoOpcao,
} from "@/lib/auth/processosEscopoCliente";

const publicadoRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: adminTokens.spacing.md,
};

const msgStyle: CSSProperties = {
  marginTop: adminTokens.spacing.md,
  fontWeight: 500,
};

export default function EventoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const escopo = useAdminEscopoCliente();

  const id = searchParams.get("id");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [local, setLocal] = useState("");
  const [imagem, setImagem] = useState("");
  const [horario, setHorario] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [processoId, setProcessoId] = useState("");
  const [processos, setProcessos] = useState<ProcessoOpcao[]>([]);
  const [bloqueado, setBloqueado] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const lista = await carregarProcessosDoEscopo(escopo.processoIds);
    setProcessos(lista);
    if (lista.length === 1) setProcessoId(lista[0].id);

    if (!id) return;

    const { data } = await supabase
      .from("eventos")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      if (!registroNoEscopoProcesso(data.processo_id, escopo.processoIds)) {
        setBloqueado(true);
        return;
      }
      setTitulo(data.titulo || "");
      setDescricao(data.descricao || "");
      setDataEvento(data.data_evento || "");
      setLocal(data.local || "");
      setImagem(data.imagem_url || "");
      setHorario(data.horario || "");
      setWhatsapp(data.whatsapp || "");
      setPublicado(data.publicado);
      setProcessoId(data.processo_id || "");
    }
  }

  async function salvar() {
    setLoading(true);
    setMsg("");

    if (!titulo) {
      setMsg("Título é obrigatório");
      setLoading(false);
      return;
    }

    if (!processoId) {
      setMsg("Selecione o processo (pasta).");
      setLoading(false);
      return;
    }

    const payload = {
      titulo,
      descricao,
      data_evento: dataEvento || null,
      local,
      imagem_url: imagem,
      horario,
      whatsapp,
      publicado,
      processo_id: processoId,
    };

    if (id) {
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", id);

      if (error) {
        setMsg("Erro ao salvar: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("eventos").insert(payload);

      if (error) {
        setMsg("Erro ao salvar: " + error.message);
        setLoading(false);
        return;
      }
    }

    setMsg("Salvo com sucesso!");
    setLoading(false);

    setTimeout(() => {
      router.push("/admin/eventos");
    }, 800);
  }

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  if (escopo.loading) return <p style={{ padding: 20 }}>Carregando...</p>;

  if (bloqueado) {
    return (
      <>
        <h1 className="admin-h1">Acesso negado</h1>
        <p className="admin-subtitle">Evento fora do seu escopo de processo.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="admin-h1">
        {id ? "Editar evento" : "Novo evento"}
      </h1>

      <div className="admin-form">
        <div>
          <label>Título</label>
          <input
            className="admin-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div>
          <label>Descrição</label>
          <textarea
            className="admin-textarea"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div>
          <label>Data do evento</label>
          <input
            type="date"
            className="admin-input"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
          />
        </div>

        <div>
          <label>Horário</label>
          <input
            className="admin-input"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />
        </div>

        <div>
          <label>Local</label>
          <input
            className="admin-input"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>

        <div>
          <label>WhatsApp (com DDD)</label>
          <input
            className="admin-input"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        <div>
          <label>Imagem (URL)</label>
          <input
            className="admin-input"
            value={imagem}
            onChange={(e) => setImagem(e.target.value)}
          />
        </div>

        <div>
          <label>Processo (pasta)</label>
          <select
            className="admin-input"
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
        </div>

        <div style={publicadoRowStyle}>
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          <label>Publicado</label>
        </div>

        {msg && <p style={msgStyle}>{msg}</p>}

        <div className="admin-save-row">
          <button
            type="button"
            onClick={salvar}
            className="admin-save-button"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </>
  );
}
