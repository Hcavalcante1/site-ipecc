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

export default function TransparenciaCompromissosAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "transparencia",
        "compromissos",
        "titulo, texto"
      );

      if (data) {
        setTitulo(data.titulo ?? "");
        setTexto(data.texto ?? "");
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
        bloco: "compromissos",
        titulo,
        texto,
      });

      setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — Compromissos e Princípios</h1>
      <p>
        Texto institucional sobre ética, governança, transparência e
        responsabilidade.
      </p>

      <label>Título da seção</label>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <label>Texto institucional</label>
      <textarea
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <button style={btnGreen} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}
