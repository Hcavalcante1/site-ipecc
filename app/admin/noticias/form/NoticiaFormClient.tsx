"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import { adminTokens } from "@/components/admin";

const publicadoRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: adminTokens.spacing.md,
};

export default function NoticiaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get("id");

  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagem, setImagem] = useState("");
  const [publicado, setPublicado] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    if (!id) return;

    const { data } = await supabase
      .from("noticias")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setTitulo(data.titulo || "");
      setResumo(data.resumo || "");
      setConteudo(data.conteudo || "");
      setImagem(data.imagem_url || "");
      setPublicado(data.publicado);
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

    const row = {
      titulo,
      resumo,
      conteudo,
      imagem_url: imagem,
      publicado,
    };

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
    carregar();
  }, []);

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
          <label>Imagem (URL)</label>
          <input
            className="admin-input"
            value={imagem}
            onChange={(e) => setImagem(e.target.value)}
          />
        </div>

        <div style={publicadoRowStyle}>
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          <label>Publicado</label>
        </div>

        {msg && (
          <p style={{ marginTop: 12, fontWeight: 500 }}>{msg}</p>
        )}

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