"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import { adminTokens } from "@/components/admin";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import {
  carregarProcessosDoEscopo,
  type ProcessoOpcao,
} from "@/lib/auth/processosEscopoCliente";

const publicadoRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: adminTokens.spacing.md,
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://eohshxaxbsdpxundsley.supabase.co";

export default function NoticiaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const escopo = useAdminEscopoCliente();

  const id = searchParams.get("id");

  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagem, setImagem] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [processoId, setProcessoId] = useState("");
  const [processos, setProcessos] = useState<ProcessoOpcao[]>([]);
  const [bloqueado, setBloqueado] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
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
    const path = `noticias/${Date.now()}-${safeName}.${ext}`;

    const fd = new FormData();
    fd.append("bucket", "paginas");
    fd.append("path", path);
    fd.append("file", file);
    fd.append("contentType", file.type);

    try {
      const res = await fetch("/api/admin/storage/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (json.ok && json.data) {
        const fullPath =
          json.data.fullPath ||
          `paginas/${json.data.path || path}`;
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${fullPath}`;
        setImagem(publicUrl);
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

  async function carregar() {
    const lista = await carregarProcessosDoEscopo();
    setProcessos(lista);
    if (lista.length === 1) setProcessoId(lista[0].id);

    if (!id) return;

    const { data } = await supabase
      .from("noticias")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      if (
        !escopo.mestre &&
        !registroNoEscopoProcesso(data.processo_id, escopo.processoIds)
      ) {
        setBloqueado(true);
        return;
      }
      setTitulo(data.titulo || "");
      setResumo(data.resumo || "");
      setConteudo(data.conteudo || "");
      setImagem(data.imagem_url || "");
      setPublicado(data.publicado);
      setProcessoId(data.processo_id || "");
    }
  }

  async function salvar() {
    setLoading(true);
    setMsg("");

    if (!titulo) {
      setMsg("Título é obrigatório");
      setLoading(false);
      return;
    }

    if (!processoId && !escopo.mestre) {
      setMsg("Selecione o processo (pasta).");
      setLoading(false);
      return;
    }

    const row: Record<string, unknown> = {
      titulo,
      resumo,
      conteudo,
      imagem_url: imagem,
      publicado,
    };

    if (processoId) {
      row.processo_id = processoId;
    }

    const { error } = id
      ? await supabase.from("noticias").update(row).eq("id", id)
      : await supabase.from("noticias").insert(row);

    if (error) {
      console.error(error);
      setMsg(`Erro ao salvar: ${error.message}`);
      setLoading(false);
      return;
    }

    setMsg("Salvo com sucesso!");
    setLoading(false);
    setTimeout(() => router.push("/admin/noticias"), 600);
  }

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  if (escopo.loading) return <p style={{ padding: 20 }}>Carregando...</p>;

  if (bloqueado) {
    return (
      <>
        <h1 className="admin-h1">Acesso negado</h1>
        <p className="admin-subtitle">
          Notícia fora do seu escopo de processo.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="admin-h1">
        {id ? "Editar notícia" : "Nova notícia"}
      </h1>

      <div className="admin-form">
        <div>
          <label>Título</label>
          <input
            className="admin-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div>
          <label>Resumo</label>
          <textarea
            className="admin-textarea"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
        </div>

        <div>
          <label>Conteúdo</label>
          <textarea
            className="admin-textarea"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        </div>

        <div>
          <label>Imagem</label>
          <input
            className="admin-input"
            value={imagem}
            onChange={(e) => setImagem(e.target.value)}
            placeholder="URL da imagem (ou envie um arquivo abaixo)"
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-block",
                padding: "6px 14px",
                background: "#2563eb",
                color: "#fff",
                borderRadius: 6,
                cursor: uploadingImg ? "wait" : "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {uploadingImg ? "Enviando..." : "Escolher arquivo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                disabled={uploadingImg}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {uploadMsg && (
              <span style={{ fontSize: 13, color: uploadMsg.startsWith("Erro") ? "#dc2626" : "#16a34a" }}>
                {uploadMsg}
              </span>
            )}
          </div>
          {imagem && (
            <img
              src={imagem}
              alt="preview"
              style={{
                marginTop: 10,
                maxHeight: 140,
                maxWidth: "100%",
                borderRadius: 6,
                objectFit: "cover",
                border: "1px solid #e5e7eb",
              }}
            />
          )}
        </div>

        <div>
          <label>
            Processo (pasta){escopo.mestre ? " — opcional" : ""}
          </label>
          <select
            className="admin-input"
            value={processoId}
            onChange={(e) => setProcessoId(e.target.value)}
          >
            <option value="">
              {escopo.mestre
                ? "Sem processo (institucional)"
                : "Selecione o processo"}
            </option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        </div>

        <div style={publicadoRowStyle}>
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          <label>Publicado</label>
        </div>

        {msg && <p style={{ marginTop: 12, fontWeight: 500 }}>{msg}</p>}

        <div className="admin-save-row">
          <button
            type="button"
            onClick={salvar}
            className="admin-save-button"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </>
  );
        }
