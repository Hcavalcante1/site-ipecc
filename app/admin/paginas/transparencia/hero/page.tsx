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

export default function TransparenciaHeroAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "transparencia",
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

  async function salvar() {
    setSalvando(true);
    setMsg("Salvando...");

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "transparencia",
        bloco: "hero",
        titulo: tituloHero,
        texto: textoHero,
      });

      setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — Hero</h1>
      <p>Edite o conteúdo principal do topo da página pública.</p>

      <label>Título do Hero</label>
      <input
        style={{ width: "100%", maxWidth: 800 }} // ✅ caixa mais larga
        value={tituloHero}
        onChange={(e) => setTituloHero(e.target.value)}
      />

      <label>Texto do Hero</label>
      <textarea
        rows={4}
        style={{ width: "100%", maxWidth: 800 }} // ✅ caixa mais larga
        value={textoHero}
        onChange={(e) => setTextoHero(e.target.value)}
      />

      <button style={btnGreen} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}