"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase autenticado (admin)
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Normaliza nome do arquivo para storage
function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function AdminEditais() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState("Chamamento público");

  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "aberto"
  );

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [editais, setEditais] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data, error } = await supabase
      .from("editais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR:", error);
      return;
    }

    setEditais(data || []);
  }

  async function salvarEdital(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let nomeArquivoEdital: string | null = null;

    if (arquivo) {
      const nomeSeguro = normalizarNomeArquivo(arquivo.name);
      nomeArquivoEdital = `${Date.now()}-${nomeSeguro}`;

      const { error } = await supabase.storage
        .from("editais")
        .upload(nomeArquivoEdital, arquivo, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (error) {
        console.error("UPLOAD PDF:", error);
        alert(error.message);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from("editais").insert({
      titulo,
      descricao,
      periodo,
      tipo,
      status,
      arquivo_pdf: nomeArquivoEdital,
    });

    if (error) {
      console.error("INSERT:", error);
      alert(error.message);
    } else {
      alert("Edital salvo com sucesso");

      setTitulo("");
      setDescricao("");
      setPeriodo("");
      setTipo("Chamamento público");
      setStatus("aberto");
      setArquivo(null);

      await carregar();
    }

    setLoading(false);
  }

  async function excluir(id: string) {
    if (!confirm("Deseja excluir este edital?")) return;

    const { error } = await supabase
      .from("editais")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("ERRO AO EXCLUIR:", error);
      alert(error.message);
      return;
    }

    alert("Edital excluído com sucesso");

    await carregar();
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editais e Chamadas Públicas</h1>

      <p className="admin-subtitle">
        Cadastro e publicação de editais públicos.
      </p>

      <h2 className="admin-h2">Cadastrar novo edital</h2>

      <form onSubmit={salvarEdital} className="admin-card">
        <label>Título do edital</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />

        <label>Descrição / Texto do edital</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          required
        />

        <label>Período</label>
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ex: 01/01/2025 a 31/01/2025"
        />

        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="Chamamento público">Chamamento público</option>
          <option value="Edital">Edital</option>
          <option value="Credenciamento">Credenciamento</option>
        </select>

        <label>Status</label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "aberto" | "encerrado" | "em_breve")
          }
        >
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
          <option value="em_breve">Em breve</option>
        </select>

        <label>Arquivo do edital (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />

        <button className="admin-button" disabled={loading}>
          {loading ? "Salvando..." : "Salvar edital"}
        </button>
      </form>

      <h2 className="admin-h2" style={{ marginTop: 30 }}>
        Editais cadastrados
      </h2>

      {editais.map((e) => (
        <div key={e.id} className="admin-card" style={{ marginTop: 10 }}>
          <strong>{e.titulo}</strong>

          {e.descricao && <p>{e.descricao}</p>}

          <p><strong>Tipo:</strong> {e.tipo}</p>
          <p><strong>Período:</strong> {e.periodo || "-"}</p>
          <p><strong>Status:</strong> {e.status}</p>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            
            {/* 🟡 EDITAR */}
            <button
              className="admin-button"
              style={{ background: "#eab308", color: "#000" }}
              onClick={() =>
                (window.location.href = `/admin/editais/${e.id}`)
              }
            >
              Editar
            </button>

            {/* 🔴 EXCLUIR */}
            <button
              className="admin-button"
              style={{ background: "#ef4444", color: "#fff" }}
              onClick={() => excluir(e.id)}
            >
              Excluir
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}
