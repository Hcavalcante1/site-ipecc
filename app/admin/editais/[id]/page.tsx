"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EditarEdital() {
  const { id } = useParams();
  const router = useRouter();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");

  // 🔥 NOVO CAMPO
  const [tipo, setTipo] = useState("Chamamento público");

  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "aberto"
  );

  const [loading, setLoading] = useState(true);

  // =========================
  // CARREGAR DADOS
  // =========================
  useEffect(() => {
    async function carregar() {
      if (!id) return;

      const { data, error } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setTitulo(data.titulo || "");
        setDescricao(data.descricao || "");
        setPeriodo(data.periodo || "");
        setTipo(data.tipo || "Chamamento público"); // 🔥 IMPORTANTE
        setStatus(data.status || "aberto");
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  // =========================
  // SALVAR
  // =========================
  async function salvar() {
    const { error } = await supabase
      .from("editais")
      .update({
        titulo,
        descricao,
        periodo,
        tipo, // 🔥 AGORA SALVA
        status,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar");
      return;
    }

    alert("Edital atualizado com sucesso");
    router.push("/admin/editais");
  }

  if (loading) return <p style={{ padding: 20 }}>Carregando...</p>;

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editar Edital</h1>

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

        {/* 🔥 TIPO (NOVO) */}
        <label>Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="Chamamento público">Chamamento público</option>
          <option value="Edital">Edital</option>
          <option value="Credenciamento">Credenciamento</option>
        </select>

        <label>Status</label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "aberto" | "encerrado" | "em_breve")
          }
        >
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
          <option value="em_breve">Em breve</option>
        </select>

        <button className="admin-button" onClick={salvar}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
}