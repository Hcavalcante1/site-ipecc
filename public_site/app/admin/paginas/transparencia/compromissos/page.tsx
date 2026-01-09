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

export default function TransparenciaCompromissosAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [texto, setTexto] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("compromissos_texto")
        .eq("slug", "transparencia")
        .single();

      if (data) {
        setTexto(data.compromissos_texto ?? "");
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
        compromissos_texto: texto,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "transparencia");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — Compromissos e Princípios</h1>
      <p>
        Texto institucional sobre ética, governança, transparência e
        responsabilidade.
      </p>

      <label>Texto institucional</label>
      <textarea
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}
