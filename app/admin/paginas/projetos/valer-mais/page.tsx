"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";
import { parsePaginaExtra } from "@/lib/cms/paginasConteudo";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://eohshxaxbsdpxundsley.supabase.co";
const SLUG = "projetos-valer-mais";
const BLOCO = "corpo";

const sInput: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e6edf3",
  fontSize: ".9rem",
};

const sTextarea: React.CSSProperties = {
  ...sInput,
  minHeight: 110,
  resize: "vertical",
};

export default function ValerMaisAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [lead, setLead] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [p4, setP4] = useState("");
  const [p5, setP5] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imagem, setImagem] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  async function handleImageUpload(file: File) {
    setUploadingImg(true);
    setUploadMsg("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const path = `projetos/${Date.now()}-${safeName}.${ext}`;
    const fd = new FormData();
    fd.append("bucket", "paginas");
    fd.append("path", path);
    fd.append("file", file);
    fd.append("contentType", file.type);
    try {
      const res = await fetch("/api/admin/storage/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.ok && json.data) {
        const fullPath = json.data.fullPath || `paginas/${json.data.path || path}`;
        setImagem(`${SUPABASE_URL}/storage/v1/object/public/${fullPath}`);
        setUploadMsg("✓ Imagem enviada");
      } else {
        setUploadMsg(`Erro: ${json.error || "falha no upload"}`);
      }
    } catch {
      setUploadMsg("Erro ao enviar imagem.");
    } finally {
      setUploadingImg(false);
    }
  }

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(supabase, SLUG, BLOCO, "titulo, texto, extra, imagem_url, video_url");
      if (data) {
        setTitulo(data.titulo || "");
        setLead(data.texto || "");
        const ps = parsePaginaExtra<string[]>(data.extra, []);
        setP1(ps[0] || "");
        setP2(ps[1] || "");
        setP3(ps[2] || "");
        setP4(ps[3] || "");
        setP5(ps[4] || "");
        setImagem(data.imagem_url || "");
        setVideoUrl((data as any).video_url || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);
    try {
      const extra = [p1, p2, p3, p4, p5].filter(Boolean);
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: SLUG,
        bloco: BLOCO,
        titulo,
        texto: lead,
        extra,
        imagem_url: imagem,
        video_url: videoUrl,
      } as any);
      setMsg(error ? `Erro: ${error.message}` : "Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Programa Valer Mais</h1>
        <p className="admin-subtitle">
          Edite o conteúdo exibido na página pública /projetos/valer-mais.
        </p>
      </div>

      <form className="admin-card" onSubmit={(e) => e.preventDefault()}>
        <label>Título:</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={sInput} />

        <label style={{ marginTop: 10 }}>Lead (subtítulo do hero):</label>
        <textarea value={lead} onChange={(e) => setLead(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>1º parágrafo:</label>
        <textarea value={p1} onChange={(e) => setP1(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>2º parágrafo:</label>
        <textarea value={p2} onChange={(e) => setP2(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>3º parágrafo:</label>
        <textarea value={p3} onChange={(e) => setP3(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>4º parágrafo:</label>
        <textarea value={p4} onChange={(e) => setP4(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>5º parágrafo:</label>
        <textarea value={p5} onChange={(e) => setP5(e.target.value)} style={sTextarea} />

        <div>
          <label style={{ marginTop: 10 }}>Imagem:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
            style={sInput}
          />
          {uploadingImg && <span>Enviando...</span>}
          {uploadMsg && <span style={{ marginLeft: 8 }}>{uploadMsg}</span>}
          {imagem && (
            <img
              src={imagem}
              alt="preview"
              style={{ marginTop: 10, maxHeight: 140, maxWidth: "100%", borderRadius: 6, objectFit: "cover", border: "1px solid #e5e7eb" }}
            />
          )}
        </div>

        <label style={{ marginTop: 10 }}>URL do Vídeo:</label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={sInput}
          placeholder="URL do vídeo (YouTube, Vimeo, etc.) — opcional"
        />

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {msg && (
          <p style={{ marginTop: 10, color: "#bbf7d0", fontSize: ".8rem" }}>{msg}</p>
        )}
      </form>
    </>
  );
}
