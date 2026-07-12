"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

// ✅ BOTÃO PADRÃO (mantido)
const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function EditaisHeroAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  // ===============================
  // 🔹 CARREGAR
  // ===============================
  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "editais",
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
  // 🔹 SALVAR (AGORA FUNCIONA)
  // ===============================
  async function salvar() {
    setSalvando(true);
    setMsg("Salvando...");

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "editais",
        bloco: "hero",
        titulo: tituloHero,
        texto: textoHero,
      });

      if (error) {
        console.error(error);
        setMsg("Erro ao salvar.");
      } else {
        setMsg("Alterações salvas com sucesso.");
      }
    } finally {
      setSalvando(false);
    }
  }

  // ===============================
  // 🔹 UI (PADRÃO CORRETO)
  // ===============================
  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Editais — Destaque / topo</h1>
      <p>Edite o conteúdo principal do topo da página de editais.</p>

      {/* 🔥 ESSENCIAL PRA NÃO QUEBRAR LAYOUT */}
      <div className="admin-form">
        <label>Título do destaque</label>
        <input
          value={tituloHero}
          onChange={(e) => setTituloHero(e.target.value)}
        />

        <label>Texto do destaque</label>
        <textarea
          rows={5}
          value={textoHero}
          onChange={(e) => setTextoHero(e.target.value)}
        />

        <button
          style={{ ...btnGreen, width: "fit-content" }}
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>

      {msg && <p>{msg}</p>}
    </div>
  );
}