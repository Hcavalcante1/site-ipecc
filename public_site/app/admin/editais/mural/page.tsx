"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔹 Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Edital = {
  id: string;
  titulo: string;
  periodo_envio: string;
  status: string;
  arquivo_pdf: string | null;
  created_at: string;
};

export default function MuralEditaisAdmin() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);

  // Campos do formulário
  const [titulo, setTitulo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [status, setStatus] = useState("aberto");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  // 🔹 Carregar editais do Supabase
  useEffect(() => {
    carregarEditais();
  }, []);

  async function carregarEditais() {
    setLoading(true);

    const { data, error } = await supabase
      .from("editais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar editais:", error);
    } else {
      setEditais(data || []);
    }

    setLoading(false);
  }

  // 🔹 Salvar novo edital
  async function salvarEdital(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    let arquivo_pdf: string | null = null;

    // Upload do PDF
    if (arquivo) {
      const nomeArquivo = `${Date.now()}-${arquivo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("editais")
        .upload(nomeArquivo, arquivo, { upsert: false });

      if (uploadError) {
        alert("Erro ao enviar o PDF");
        console.error(uploadError);
        setSalvando(false);
        return;
      }

      // salva apenas o caminho
      arquivo_pdf = `editais/${nomeArquivo}`;
    }

    // Insert no banco
    const { error } = await supabase.from("editais").insert({
      titulo,
      periodo_envio: periodo,
      status,
      arquivo_pdf,
    });

    if (error) {
      alert("Erro ao salvar edital");
      console.error(error);
    } else {
      setTitulo("");
      setPeriodo("");
      setStatus("aberto");
      setArquivo(null);
      carregarEditais();
    }

    setSalvando(false);
  }

  // 🔹 Atualizar status
  async function atualizarStatus(id: string, novoStatus: string) {
    const { error } = await supabase
      .from("editais")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar status");
      console.error(error);
    } else {
      carregarEditais();
    }
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Mural de Editais</h1>
      <p className="admin-subtitle">
        Gerencie os editais que aparecem na página pública.
      </p>

      {/* FORMULÁRIO */}
      <form onSubmit={salvarEdital} className="admin-card">
        <label>Título do edital</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />

        <label>Período de envio</label>
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ex: 01/01/2025 a 31/01/2025"
        />

        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
          <option value="em_breve">Em breve</option>
        </select>

        <label>PDF do edital</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />

        <button className="admin-button" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar edital"}
        </button>
      </form>

      {/* LISTAGEM */}
      <h2 className="admin-h2" style={{ marginTop: 32 }}>
        Editais cadastrados
      </h2>

      {loading ? (
        <p>Carregando...</p>
      ) : editais.length === 0 ? (
        <p>Nenhum edital cadastrado.</p>
      ) : (
        <div className="admin-list">
          {editais.map((edital) => (
            <div key={edital.id} className="admin-card">
              <strong>{edital.titulo}</strong>
              <p>Período: {edital.periodo_envio}</p>
              <p>Status: {edital.status}</p>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {edital.status !== "aberto" && (
                  <button
                    className="admin-button"
                    onClick={() => atualizarStatus(edital.id, "aberto")}
                  >
                    Abrir
                  </button>
                )}

                {edital.status !== "encerrado" && (
                  <button
                    className="admin-button"
                    onClick={() => atualizarStatus(edital.id, "encerrado")}
                  >
                    Encerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

