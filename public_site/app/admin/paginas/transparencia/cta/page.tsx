"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CtaData = {
  titulo: string;
  texto: string;
  label_botao: string;
  url: string;
};

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

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [labelBotao, setLabelBotao] = useState("");
  const [url, setUrl] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("cta")
        .eq("slug", "transparencia")
        .single();

      if (data?.cta) {
        setTitulo(data.cta.titulo ?? "");
        setTexto(data.cta.texto ?? "");
        setLabelBotao(data.cta.label_botao ?? "");
        setUrl(data.cta.url ?? "");
      }

      setLoading(false);
    }

    load();
  }, []);

  async function uploadArquivo(file: File) {
    const path = `transparencia/cta/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("docs")
      .upload(path, file);

    if (error) {
      alert("Erro ao enviar arquivo");
      return;
    }

    const { data } = supabase.storage.from("docs").getPublicUrl(path);
    setUrl(data.publicUrl);
  }

  async function salvar() {
    setMsg("Salvando...");

    const payload: CtaData = {
      titulo,
      texto,
      label_botao: labelBotao,
      url,
    };

    const { error } = await supabase
      .from("paginas")
      .update({
        cta: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "transparencia");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — CTA / Acesso rápido</h1>
      <p>Bloco final com botão de acesso direto a documentos.</p>

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
        value={labelBotao}
        onChange={(e) => setLabelBotao(e.target.value)}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          style={btnGreen}
          onClick={() => fileRef.current?.click()}
        >
          Inserir arquivo
        </button>

        {url && (
          <button
            type="button"
            style={btnRed}
            onClick={() => setUrl("")}
          >
            Remover arquivo
          </button>
        )}
      </div>

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}

      <input
        type="file"
        hidden
        ref={fileRef}
        onChange={(e) => {
          if (!e.target.files) return;
          uploadArquivo(e.target.files[0]);
        }}
      />
    </div>
  );
}

