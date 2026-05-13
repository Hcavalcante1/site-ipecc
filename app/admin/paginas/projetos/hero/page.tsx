"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProjetosHeroAdmin() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 CARREGAR DADOS
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "projetos")
        .eq("bloco", "hero")
        .maybeSingle();

      if (data) {
        setTitulo(data.titulo || "");
        setTexto(data.texto || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // 🔹 SALVAR
  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "projetos",
          bloco: "hero",
          titulo,
          texto,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "pagina_slug,bloco",
        }
      );

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Hero salvo com sucesso.");
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Projetos — Hero</h1>
      <p>Edite o topo da página de projetos.</p>

      <div className="admin-form">
        <label>Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Texto</label>
        <textarea
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        {/* 🔥 BOTÃO PADRÃO */}
        <button
          className="admin-button"
          onClick={salvar}
        >
          Salvar alterações
        </button>
      </div>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}