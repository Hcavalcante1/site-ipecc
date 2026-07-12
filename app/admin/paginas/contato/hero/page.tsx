"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function ContatoHeroAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  // ===============================
  // CARREGAR HERO
  // ===============================
  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "contato",
        "hero",
        "titulo, texto"
      );

      if (data) {
        setTituloHero(data.titulo ?? "");
        setTextoHero(data.texto ?? "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // ===============================
  // SALVAR (UPSERT CORRETO)
  // ===============================
  async function salvar() {
    setSalvando(true);
    setMsg("Salvando...");

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "contato",
        bloco: "hero",
        titulo: tituloHero,
        texto: textoHero,
      });

      if (error) {
        setMsg("Erro ao salvar: " + error.message);
        return;
      }

      setMsg("Alterações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Contato — Destaque / topo</h1>

      <label>Título do destaque</label>
      <input
        value={tituloHero}
        onChange={(e) => setTituloHero(e.target.value)}
      />

      <label>Texto do destaque</label>
      <textarea
        rows={4}
        value={textoHero}
        onChange={(e) => setTextoHero(e.target.value)}
      />

      <button style={btnGreen} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}