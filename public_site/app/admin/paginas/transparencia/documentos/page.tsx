"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Documento = {
  label: string;
  url: string;
};

type Grupo = {
  titulo: string;
  itens: Documento[];
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

export default function TransparenciaDocumentosAdmin() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadCtx = useRef<{ gi: number; di: number } | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("documentos")
        .eq("slug", "transparencia")
        .single();

      if (data?.documentos) {
        setGrupos(data.documentos);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function uploadArquivo(file: File, gi: number, di: number) {
    const path = `transparencia/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("docs")
      .upload(path, file);

    if (error) {
      alert("Erro ao enviar arquivo");
      return;
    }

    const { data } = supabase.storage.from("docs").getPublicUrl(path);

    const cp = [...grupos];
    cp[gi].itens[di].url = data.publicUrl;
    setGrupos(cp);
  }

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas")
      .update({
        documentos: grupos,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "transparencia");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — Documentos</h1>
      <p>Gerencie os documentos institucionais publicados.</p>

      {grupos.map((grupo, gi) => (
        <div key={gi} className="admin-card" style={{ marginTop: 16 }}>
          <label>Título do grupo</label>
          <input
            value={grupo.titulo}
            onChange={(e) => {
              const cp = [...grupos];
              cp[gi].titulo = e.target.value;
              setGrupos(cp);
            }}
          />

          {grupo.itens.map((doc, di) => (
            <div key={di} style={{ marginTop: 12 }}>
              <label>Nome do documento</label>
              <input
                value={doc.label}
                onChange={(e) => {
                  const cp = [...grupos];
                  cp[gi].itens[di].label = e.target.value;
                  setGrupos(cp);
                }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  style={btnGreen}
                  onClick={() => {
                    uploadCtx.current = { gi, di };
                    fileRef.current?.click();
                  }}
                >
                  Inserir arquivo
                </button>

                <button
                  type="button"
                  style={btnRed}
                  onClick={() => {
                    const cp = [...grupos];
                    cp[gi].itens.splice(di, 1);
                    setGrupos(cp);
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}

          <button
            style={btnGreen}
            type="button"
            onClick={() => {
              const cp = [...grupos];
              cp[gi].itens.push({ label: "", url: "" });
              setGrupos(cp);
            }}
          >
            + Adicionar documento
          </button>

          <button
            style={btnRed}
            type="button"
            onClick={() => {
              const cp = [...grupos];
              cp.splice(gi, 1);
              setGrupos(cp);
            }}
          >
            Remover grupo
          </button>
        </div>
      ))}

      <button
        style={btnGreen}
        type="button"
        onClick={() =>
          setGrupos([...grupos, { titulo: "", itens: [] }])
        }
      >
        + Adicionar grupo
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
          if (!e.target.files || !uploadCtx.current) return;
          uploadArquivo(
            e.target.files[0],
            uploadCtx.current.gi,
            uploadCtx.current.di
          );
        }}
      />
    </div>
  );
}
