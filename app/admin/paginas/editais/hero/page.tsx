"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  // ===============================
  // 🔹 CARREGAR
  // ===============================
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "editais")
        .eq("bloco", "hero")
        .maybeSingle();

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
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "editais",
          bloco: "hero",
          titulo: tituloHero,
          texto: textoHero,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "pagina_slug,bloco",
        }
      );

    if (error) {
      console.error(error);
      setMsg("Erro ao salvar.");
    } else {
      setMsg("Alterações salvas com sucesso.");
    }
  }

  // ===============================
  // 🔹 UI (PADRÃO CORRETO)
  // ===============================
  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Editais — Hero</h1>
      <p>Edite o conteúdo principal do topo da página de editais.</p>

      {/* 🔥 ESSENCIAL PRA NÃO QUEBRAR LAYOUT */}
      <div className="admin-form">
        <label>Título do Hero</label>
        <input
          value={tituloHero}
          onChange={(e) => setTituloHero(e.target.value)}
        />

        <label>Texto do Hero</label>
        <textarea
          rows={5}
          value={textoHero}
          onChange={(e) => setTextoHero(e.target.value)}
        />

        <button
          style={{ ...btnGreen, width: "fit-content" }}
          onClick={salvar}
        >
          Salvar alterações
        </button>
      </div>

      {msg && <p>{msg}</p>}
    </div>
  );
}