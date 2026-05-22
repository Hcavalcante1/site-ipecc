"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function QuemSomosHeroAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");

  const textAreaStyle: CSSProperties = {
    resize: "vertical" as const,
    minHeight: 120,
    width: "100%",
    padding: "10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#0f172a",
    color: "#fff",
    fontSize: "14px",
  };

  // ✅ CARREGAR DADOS EXISTENTES
  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "hero")
        .maybeSingle();

      if (data) {
        setTitulo(data.titulo || "");
        setTexto(data.texto || "");
      }
    }

    loadData();
  }, []);

  // ✅ SALVAR
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("paginas_conteudo")
        .upsert(
          {
            pagina_slug: "quem-somos",
            bloco: "hero",
            titulo,
            texto,
          },
          {
            onConflict: "pagina_slug,bloco",
          }
        );

      if (error) throw error;

      setMsg("Salvo com sucesso.");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar.");
    }
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Hero – Quem Somos</h1>

      <form
        className="admin-form"
        style={{ marginTop: 24 }}
        onSubmit={handleSubmit}
      >
        <label>Título</label>
        <input
          className="admin-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label style={{ marginTop: 10 }}>Texto</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textAreaStyle}
        />

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 14 }}
        >
          Salvar
        </button>

        {msg && (
          <p style={{ marginTop: 10, fontSize: "12px", color: "#86efac" }}>
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}