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

export default function ContatoHeroAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [tituloHero, setTituloHero] = useState("");
  const [textoHero, setTextoHero] = useState("");

  // ===============================
  // CARREGAR HERO
  // ===============================
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "contato")
        .eq("bloco", "hero")
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar:", error);
      }

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
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "contato",
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
      setMsg("Erro ao salvar: " + error.message);
      return;
    }

    setMsg("Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Contato — Hero</h1>

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

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}