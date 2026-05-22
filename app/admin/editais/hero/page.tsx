"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function HeroAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // ===============================
  // CARREGAR HERO
  // ===============================
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("editais_secoes")
        .select("*")
        .eq("tipo", "hero")
        .limit(1);

      if (error) {
        console.error("Erro ao carregar hero:", error);
      }

      const hero = data?.[0];

      if (hero) {
        setId(hero.id);
        setTitulo(hero.titulo || "");
        setSubtitulo(hero.subtitulo || "");
        setDescricao(hero.descricao || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // ===============================
  // SALVAR (CORRIGIDO)
  // ===============================
  async function salvar() {
    setMsg("Salvando...");

    if (!id) {
      setMsg("Hero não encontrado");
      return;
    }

    const { error } = await supabase
      .from("editais_secoes")
      .update({
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim(),
        descricao: descricao.trim(),
      })
      .eq("id", id);

    if (error) {
      console.error("ERRO AO SALVAR HERO:", error);
      setMsg("Erro ao salvar");
      return;
    }

    setMsg("Salvo com sucesso");
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="admin-card">
      <h1>Hero — Editais</h1>

      <label>Título</label>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <label>Subtítulo</label>
      <input
        value={subtitulo}
        onChange={(e) => setSubtitulo(e.target.value)}
      />

      <label>Descrição</label>
      <textarea
        rows={5}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <div style={{ marginTop: 20 }}>
        <button style={btnGreen} onClick={salvar}>
          Salvar
        </button>
      </div>

      {msg && <p>{msg}</p>}
    </div>
  );
}