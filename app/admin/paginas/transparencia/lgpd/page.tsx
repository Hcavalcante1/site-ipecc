"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LinkItem = { label: string; url: string };

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

export default function TransparenciaLgpdAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([]);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadCtx = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo,texto,extra")
        .eq("pagina_slug", "transparencia")
        .eq("bloco", "lgpd_integridade")
        .maybeSingle();

      if (data) {
        setTitulo(data.titulo ?? "");
        setTexto(data.texto ?? "");
        setLinks(data.extra?.links ?? []);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function uploadArquivo(file: File, li: number) {
    const path = `transparencia/lgpd/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("docs")
      .upload(path, file);

    if (error) {
      alert("Erro ao enviar arquivo");
      return;
    }

    const { data } = supabase.storage.from("docs").getPublicUrl(path);

    const cp = [...links];
    cp[li].url = data.publicUrl;
    setLinks(cp);
  }

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "transparencia",
          bloco: "lgpd_integridade",
          titulo,
          texto,
          extra: { links },
        },
        { onConflict: "pagina_slug,bloco" }
      );

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — LGPD e Integridade</h1>

      <label>Título da seção</label>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />

      <label>Texto institucional</label>
      <textarea
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <hr />

      <h3>Links e canais</h3>

      {links.map((link, li) => (
        <div key={li} style={{ marginTop: 12 }}>
          <label>Nome</label>
          <input
            value={link.label}
            onChange={(e) => {
              const cp = [...links];
              cp[li].label = e.target.value;
              setLinks(cp);
            }}
          />

          <label>URL ou mailto:</label>
          <input
            value={link.url}
            onChange={(e) => {
              const cp = [...links];
              cp[li].url = e.target.value;
              setLinks(cp);
            }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              style={btnGreen}
              onClick={() => {
                uploadCtx.current = li;
                fileRef.current?.click();
              }}
            >
              Inserir arquivo
            </button>

            <button
              type="button"
              style={btnRed}
              onClick={() => {
                const cp = [...links];
                cp.splice(li, 1);
                setLinks(cp);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        style={btnGreen}
        onClick={() => setLinks([...links, { label: "", url: "" }])}
      >
        + Adicionar link
      </button>

      <hr />

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}

      <input
        type="file"
        hidden
        ref={fileRef}
        onChange={(e) => {
          if (!e.target.files || uploadCtx.current === null) return;
          uploadArquivo(e.target.files[0], uploadCtx.current);
        }}
      />
    </div>
  );
}
