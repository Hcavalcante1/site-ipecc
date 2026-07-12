"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/supabaseClient";

const PAGINA = "contato";
const BLOCO = "cta";

export default function AdminContatoCTA() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔒 Estados isolados
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoLink, setBotaoLink] = useState("");

  // 🔥 NOVO CAMPO
  const [descricao, setDescricao] = useState("");

  // =========================
  // LOAD
  // =========================
  async function load() {
    setLoading(true);

    const cta = await fetchPaginaConteudo(supabase, PAGINA, BLOCO);
    const extra = parsePaginaExtra<{
      botao_texto?: string;
      botao_link?: string;
      descricao?: string;
    }>(cta?.extra, {});

    if (cta) {
      setTitulo(String(cta.titulo || ""));
      setTexto(String(cta.texto || ""));
      setBotaoTexto(String(extra.botao_texto || ""));
      setBotaoLink(String(extra.botao_link || ""));
      setDescricao(String(extra.descricao || ""));
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // =========================
  // SAVE
  // =========================
  async function salvar() {
    setSaving(true);

    // 🔥 AGORA SALVA TUDO
    const novoExtra = {
      botao_texto: botaoTexto,
      botao_link: botaoLink,
      descricao: descricao, // 🔥 NOVO
    };

    const { error } = await upsertPaginaConteudo(supabase, {
      pagina_slug: PAGINA,
      bloco: BLOCO,
      titulo: titulo.trim(),
      texto: texto.trim(),
      extra: novoExtra,
    });

    if (error) {
      console.error(error);
      alert("Erro ao salvar");
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    alert("Salvo com sucesso");
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h1 style={{ marginBottom: 20 }}>Chamada — Página Contato</h1>

      <div
        style={{
          display: "grid",
          gap: 15,
          background: "#020617",
          padding: 30,
          borderRadius: 20,
        }}
      >
        <input
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={input}
        />

        <textarea
          placeholder="Texto (lado esquerdo)"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textarea}
        />

        <input
          placeholder="Texto do botão"
          value={botaoTexto}
          onChange={(e) => setBotaoTexto(e.target.value)}
          style={input}
        />

        <input
          placeholder="Link do botão"
          value={botaoLink}
          onChange={(e) => setBotaoLink(e.target.value)}
          style={input}
        />

        {/* 🔥 NOVO CAMPO */}
        <textarea
          placeholder="Descrição da chamada (lado direito)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={textarea}
        />

        <button onClick={salvar} style={button} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// =========================
// STYLES
// =========================

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#020617",
  color: "#fff",
};

const textarea = {
  ...input,
  height: 120,
};

const button = {
  background: "#22c55e",
  padding: 12,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};