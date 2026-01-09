"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [textoIntro, setTextoIntro] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("titulo_hero, texto_hero, texto_intro")
        .eq("slug", "transparencia")
        .single();

      if (data) {
        setTituloHero(data.titulo_hero ?? "");
        setTextoHero(data.texto_hero ?? "");
        setTextoIntro(data.texto_intro ?? "");
      }

      setLoading(false);
    }

    load();
  }, []);

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas")
      .update({
        titulo_hero: tituloHero,
        texto_hero: textoHero,
        texto_intro: textoIntro,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "transparencia");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — Hero</h1>
      <p>Edite o conteúdo principal do topo da página pública.</p>

      <label>Título do Hero</label>
      <input
        value={tituloHero}
        onChange={(e) => setTituloHero(e.target.value)}
      />

      <label>Texto do Hero</label>
      <textarea
        rows={4}
        value={textoHero}
        onChange={(e) => setTextoHero(e.target.value)}
      />

      <label>Texto introdutório</label>
      <textarea
        rows={4}
        value={textoIntro}
        onChange={(e) => setTextoIntro(e.target.value)}
      />

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}
