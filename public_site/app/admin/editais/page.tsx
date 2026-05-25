"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  buildStorageFileName,
  PDF_ACCEPT,
  validatePdfFile,
} from "@/lib/fileUploadGuards";

// Cliente Supabase autenticado (admin)
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminEditais() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "aberto"
  );
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function selecionarArquivo(file: File | undefined, input: HTMLInputElement) {
    if (!file) {
      setArquivo(null);
      return;
    }

    try {
      validatePdfFile(file);
      setArquivo(file);
    } catch (err) {
      setArquivo(null);
      input.value = "";
      alert(err instanceof Error ? err.message : "Arquivo invalido.");
    }
  }

  async function salvarEdital(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let nomeArquivoEdital: string | null = null;

    // =======================
    // UPLOAD DO PDF DO EDITAL
    // =======================
    if (arquivo) {
      validatePdfFile(arquivo);
      nomeArquivoEdital = buildStorageFileName(arquivo, "edital");

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

    // =======================
    // GRAVAÇÃO DO EDITAL
    // =======================
    const { error } = await supabase.from("editais").insert({
      titulo,
      descricao,
      periodo,
      status,
      arquivo_pdf: nomeArquivoEdital,
    });

    if (error) {
      console.error("INSERT:", error);
      alert(error.message);
    } else {
      alert("Edital salvo com sucesso");

      // reset
      setTitulo("");
      setDescricao("");
      setPeriodo("");
      setStatus("aberto");
      setArquivo(null);
    }

    setLoading(false);
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
          accept={PDF_ACCEPT}
          onChange={(e) => selecionarArquivo(e.target.files?.[0], e.currentTarget)}
        />

        <button className="admin-button" disabled={loading}>
          {loading ? "Salvando..." : "Salvar edital"}
        </button>
      </form>
    </div>
  );
}


