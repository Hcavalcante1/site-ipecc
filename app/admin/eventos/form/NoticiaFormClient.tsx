"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";

export default function EventoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get("id");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [local, setLocal] = useState("");
  const [imagem, setImagem] = useState("");
  const [horario, setHorario] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [publicado, setPublicado] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    if (!id) return;

    const { data } = await supabase
      .from("eventos")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setTitulo(data.titulo || "");
      setDescricao(data.descricao || "");
      setDataEvento(data.data_evento || "");
      setLocal(data.local || "");
      setImagem(data.imagem_url || "");
      setHorario(data.horario || "");
      setWhatsapp(data.whatsapp || "");
      setPublicado(data.publicado);
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

    if (id) {
      const { error } = await supabase
        .from("eventos")
        .update({
          titulo,
          descricao,
          data_evento: dataEvento,
          local,
          imagem_url: imagem,
          horario,
          whatsapp,
          publicado,
        })
        .eq("id", id);

      if (error) {
        setMsg("Erro ao salvar: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("eventos")
        .insert({
          titulo,
          descricao,
          data_evento: dataEvento,
          local,
          imagem_url: imagem,
          horario,
          whatsapp,
          publicado,
        });

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
    carregar();
  }, []);

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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          <label>Publicado</label>
        </div>

        {/* ✅ MENSAGEM PADRÃO */}
        {msg && (
          <p style={{ marginTop: 10, fontWeight: 500 }}>
            {msg}
          </p>
        )}

        <div className="admin-save-row">
          <button
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