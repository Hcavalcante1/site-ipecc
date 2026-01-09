"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LinkItem = { label: string; url: string };

type LgpdData = {
  texto: string;
  emails: string[];
  links: LinkItem[];
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

export default function TransparenciaLgpdAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [texto, setTexto] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadCtx = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas")
        .select("lgpd")
        .eq("slug", "transparencia")
        .single();

      if (data?.lgpd) {
        setTexto(data.lgpd.texto ?? "");
        setEmails(data.lgpd.emails ?? []);
        setLinks(data.lgpd.links ?? []);
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

    const payload: LgpdData = {
      texto,
      emails,
      links,
    };

    const { error } = await supabase
      .from("paginas")
      .update({
        lgpd: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "transparencia");

    setMsg(error ? "Erro ao salvar." : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Transparência — LGPD</h1>
      <p>Gerencie as informações de proteção de dados e privacidade.</p>

      <label>Texto institucional</label>
      <textarea
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <hr />

      <h3>E-mails de contato</h3>

      {emails.map((email, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={email}
            onChange={(e) => {
              const cp = [...emails];
              cp[i] = e.target.value;
              setEmails(cp);
            }}
          />
          <button
            type="button"
            style={btnRed}
            onClick={() => {
              const cp = [...emails];
              cp.splice(i, 1);
              setEmails(cp);
            }}
          >
            Remover
          </button>
        </div>
      ))}

      <button
        type="button"
        style={btnGreen}
        onClick={() => setEmails([...emails, ""])}
      >
        + Adicionar e-mail
      </button>

      <hr />

      <h3>Links e políticas</h3>

      {links.map((link, li) => (
        <div key={li} style={{ marginTop: 12 }}>
          <label>Nome do documento</label>
          <input
            value={link.label}
            onChange={(e) => {
              const cp = [...links];
              cp[li].label = e.target.value;
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

