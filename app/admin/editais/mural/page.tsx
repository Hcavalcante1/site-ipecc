"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// BOTÕES
const base = {
  border: "none",
  borderRadius: 999,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnGreen = { ...base, background: "#22c55e", color: "#062e1b" };
const btnGray = { ...base, background: "#e5e7eb", color: "#111827" };
const btnRed = { ...base, background: "#dc2626", color: "#fff" };
const btnBlue = { ...base, background: "#2563eb", color: "#fff" };

type Edital = {
  id: string;
  titulo: string;
  periodo_envio: string;
  status: string;
  arquivo_pdf: string | null;
};

export default function Page() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [titulo, setTitulo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [status, setStatus] = useState("aberto");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("editais").select("*");
    setEditais(data || []);
  }

  function limpar(nome: string) {
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");
  }

  async function salvar(e: any) {
    e.preventDefault();

    let url = null;

    if (arquivo) {
      const nome = `${Date.now()}-${limpar(arquivo.name)}`;

      await supabase.storage
        .from("editais")
        .upload(nome, arquivo, { contentType: "application/pdf" });

      url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/editais/${nome}`;
    }

    if (editandoId) {
      await supabase
        .from("editais")
        .update({
          titulo,
          periodo_envio: periodo,
          status,
          ...(url && { arquivo_pdf: url }),
        })
        .eq("id", editandoId);
    } else {
      await supabase.from("editais").insert({
        titulo,
        periodo_envio: periodo,
        status,
        arquivo_pdf: url,
      });
    }

    setTitulo("");
    setPeriodo("");
    setStatus("aberto");
    setArquivo(null);
    setEditandoId(null);

    load();
  }

  function editar(e: Edital) {
    setTitulo(e.titulo);
    setPeriodo(e.periodo_envio);
    setStatus(e.status);
    setEditandoId(e.id);
  }

  async function excluir(e: Edital) {
    await supabase.from("editais").delete().eq("id", e.id);
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Mural de Editais</h1>

      {/* FORM */}
      <form onSubmit={salvar} style={{ marginBottom: 20 }}>
        <input
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <input
          placeholder="Período"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
        </select>

        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        />

        <button type="button" style={btnGray} onClick={() => fileRef.current?.click()}>
          PDF
        </button>

        <button style={btnGreen}>
          {editandoId ? "Atualizar" : "Salvar"}
        </button>
      </form>

      {/* LISTA */}
      {editais.map((e) => (
        <div
          key={e.id}
          style={{
            border: "1px solid #333",
            padding: 15,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <strong>{e.titulo}</strong>
            <p>{e.periodo_envio}</p>
          </div>

          {/* 🔥 BOTÕES FORÇADOS */}
          <div
            style={{
              display: "flex",
              gap: 10,
              minWidth: 250,
              justifyContent: "flex-end",
            }}
          >
            {e.arquivo_pdf && (
              <button
                style={btnGray}
                onClick={() => window.open(e.arquivo_pdf!, "_blank")}
              >
                PDF
              </button>
            )}

            <button style={btnBlue} onClick={() => editar(e)}>
              EDITAR
            </button>

            <button style={btnRed} onClick={() => excluir(e)}>
              APAGAR
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}