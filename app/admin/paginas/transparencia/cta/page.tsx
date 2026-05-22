"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnRed = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function TransparenciaCtaAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [botaoLabel, setBotaoLabel] = useState("");
  const [botaoUrl, setBotaoUrl] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo,texto,extra")
        .eq("pagina_slug", "transparencia")
        .eq("bloco", "cta_docs")
        .maybeSingle();

      if (data) {
        setTitulo(data.titulo ?? "");
        setTexto(data.texto ?? "");
        setBotaoLabel(data.extra?.botaoLabel ?? "");
        setBotaoUrl(data.extra?.botaoUrl ?? "");
      }

      setLoading(false);
    }

    load();
  }, []);

  async function uploadArquivo(file: File) {
    setUploading(true);
    setMsg("Enviando arquivo...");

    const fileName = file.name.replace(/\s+/g, "-");
    const path = `transparencia/cta/${Date.now()}-${fileName}`;

    const { error } = await supabase.storage
      .from("docs")
      .upload(path, file, { upsert: true });

    if (error) {
      setUploading(false);
      setMsg("Erro ao enviar arquivo.");
      return;
    }

    const { data } = supabase.storage.from("docs").getPublicUrl(path);

    setBotaoUrl(data.publicUrl);

    if (!botaoLabel.trim()) {
      setBotaoLabel(file.name.replace(/\.[^/.]+$/, ""));
    }

    setUploading(false);
    setMsg("Arquivo enviado com sucesso.");
  }

  async function salvar() {
    if (uploading) {
      setMsg("Aguarde o envio do arquivo terminar.");
      return;
    }

    if (!botaoUrl.trim()) {
      setMsg("Insira um arquivo antes de salvar.");
      return;
    }

    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "transparencia",
          bloco: "cta_docs",
          titulo,
          texto,
          extra: {
            botaoLabel,
            botaoUrl,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pagina_slug,bloco" }
      );

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — CTA / Acesso rápido</h1>

      <label>Título</label>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />

      <label>Texto</label>
      <textarea
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <label>Texto do botão</label>
      <input
        value={botaoLabel}
        onChange={(e) => setBotaoLabel(e.target.value)}
      />

      {botaoUrl && (
        <div style={{ marginTop: 12 }}>
          <label>Arquivo vinculado</label>
          <input value={botaoUrl} readOnly />
          <div style={{ marginTop: 8 }}>
            <a href={botaoUrl} target="_blank" rel="noreferrer">
              Ver arquivo atual
            </a>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={btnGreen}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Inserir arquivo"}
        </button>

        {botaoUrl && (
          <button
            type="button"
            style={btnRed}
            onClick={() => setBotaoUrl("")}
            disabled={uploading}
          >
            Remover arquivo
          </button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button style={btnGreen} onClick={salvar} disabled={uploading}>
          Salvar alterações
        </button>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <input
        type="file"
        hidden
        ref={fileRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        onChange={(e) => {
          if (!e.target.files?.length) return;
          uploadArquivo(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}