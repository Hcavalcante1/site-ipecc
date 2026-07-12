"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

export default function ProjetosHeroAdmin() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 CARREGAR DADOS
  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos",
        "hero",
        "titulo, texto"
      );

      if (data) {
        setTitulo(data.titulo || "");
        setTexto(data.texto || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // 🔹 SALVAR
  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "projetos",
        bloco: "hero",
        titulo,
        texto,
      });

      if (error) {
        setMsg(`Erro ao salvar: ${error.message}`);
        return;
      }

      setMsg("Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Projetos — Destaque / topo</h1>
      <p>Edite o topo da página de projetos.</p>

      <div className="admin-form">
        <label>Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Texto</label>
        <textarea
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        {/* 🔥 BOTÃO PADRÃO */}
        <AdminSalvarButton salvando={salvando} onClick={salvar} />
      </div>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}