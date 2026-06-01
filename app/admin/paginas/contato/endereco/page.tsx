"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
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

export default function ContatoEnderecoAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [titulo, setTitulo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [horario, setHorario] = useState("");
  const [mapaLink, setMapaLink] = useState("");

  // =========================
  // LOAD
  // =========================
  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(supabase, "contato", "endereco");
      const extra = parsePaginaExtra<{ horario?: string; mapa_url?: string }>(
        data?.extra,
        {}
      );

      if (data) {
        setTitulo(data.titulo || "");
        setEndereco(data.texto || "");
        setHorario(extra.horario || "");
        setMapaLink(extra.mapa_url || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // =========================
  // SAVE (CORRIGIDO)
  // =========================
  async function salvar() {
    setSalvando(true);
    setMsg("Salvando...");

    try {
    const { error } = await upsertPaginaConteudo(supabase, {
      pagina_slug: "contato",
      bloco: "endereco",
      titulo,
      texto: endereco,
      extra: {
        horario,
        mapa_url: mapaLink,
      },
    });

    if (error) {
      console.error(error);
      setMsg("❌ Erro ao salvar");
      return;
    }

    // 🔥 RECARREGA DO BANCO (faz os dados ficarem fixos)
    const data = await fetchPaginaConteudo(supabase, "contato", "endereco");
    const extraReload = parsePaginaExtra<{ horario?: string; mapa_url?: string }>(
      data?.extra,
      {}
    );

    if (data) {
      setTitulo(data.titulo || "");
      setEndereco(data.texto || "");
      setHorario(extraReload.horario || "");
      setMapaLink(extraReload.mapa_url || "");
    }

    setMsg("✅ Salvo com sucesso");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="admin-card">
      <h1>Contato — Endereço</h1>

      <label>Título</label>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />

      <label>Endereço completo</label>
      <textarea
        rows={3}
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
      />

      <label>Horário</label>
      <input value={horario} onChange={(e) => setHorario(e.target.value)} />

      <label>Mapa (cole iframe OU link)</label>
      <input
        value={mapaLink}
        onChange={(e) => {
          let value = e.target.value;

          // 🔥 remove iframe automaticamente
          if (value.includes("<iframe")) {
            const match = value.match(/src="([^"]+)"/);
            if (match) value = match[1];
          }

          setMapaLink(value);
        }}
      />

      <button style={btnGreen} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}


