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

export default function TransparenciaHeroAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "transparencia")
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

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .update({
        titulo: tituloHero,
        texto: textoHero,
        updated_at: new Date().toISOString(),
      })
      .eq("pagina_slug", "transparencia")
      .eq("bloco", "hero");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
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

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}