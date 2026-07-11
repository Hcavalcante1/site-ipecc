"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { adminTokens } from "@/components/admin";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

const wrapTopStyle: CSSProperties = {
  marginTop: adminTokens.spacing.sm * 2,
};

const sectionTopStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base + adminTokens.spacing.sm,
};

const descricaoStyle: CSSProperties = {
  fontSize: adminTokens.typography.fontSize.xs,
  opacity: 0.8,
};

const statusLinhaStyle: CSSProperties = {
  fontSize: adminTokens.typography.fontSize.xs,
  marginTop: adminTokens.spacing.sm,
};

const acoesRowStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base,
  display: "flex",
  gap: adminTokens.spacing.sm,
};

const excluirBtnStyle: CSSProperties = {
  background: adminTokens.colors.error.background,
  color: adminTokens.colors.error.text,
  border: "none",
  borderRadius: adminTokens.borderRadius.full,
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  cursor: "pointer",
  fontWeight: 600,
};

type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  publicado: boolean;
  created_at: string;
  processo_id?: string | null;
};

export default function NoticiasAdmin() {
  const escopo = useAdminEscopoCliente();
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarNoticias() {
    const { data } = await supabase
      .from("noticias")
      .select("*")
      .order("created_at", { ascending: false });

    const lista = ((data || []) as Noticia[]).filter((n) =>
      registroNoEscopoProcesso(n.processo_id, escopo.processoIds)
    );
    setNoticias(lista);
    setLoading(false);
  }

  async function excluir(id: string) {
    const confirmar = confirm("Deseja excluir esta notícia?");
    if (!confirmar) return;

    try {
      const { error } = await supabase.from("noticias").delete().eq("id", id);

      if (error) {
        console.error("Erro ao excluir notícia:", error.message);
        alert(`Erro ao excluir notícia: ${error.message}`);
        return;
      }

      await carregarNoticias();
    } catch (e) {
      console.error("Exceção ao excluir:", e);
      alert("Erro ao excluir notícia");
    }
  }

  useEffect(() => {
    if (escopo.loading) return;
    void carregarNoticias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  return (
    <>
      <h1 className="admin-h1">Notícias</h1>
      <p className="admin-subtitle">
        Gerencie as notícias publicadas em /noticias e nos destaques da página inicial.
        Use esta tela para criar, editar, publicar ou retirar notícias do ar.
      </p>

      <div style={wrapTopStyle}>
        <a href="/admin/noticias/form">
          <button className="admin-button">+ Nova notícia</button>
        </a>
      </div>

      {loading || escopo.loading ? (
        <p style={sectionTopStyle}>Carregando...</p>
      ) : (
        <div className="admin-grid" style={sectionTopStyle}>
          {noticias.map((n) => (
            <div key={n.id} className="admin-card">
              <h3>{n.titulo}</h3>
              <p style={descricaoStyle}>{n.resumo}</p>

              <p style={statusLinhaStyle}>
                {n.publicado ? "🟢 Publicado" : "🔴 Rascunho"}
              </p>

              <div style={acoesRowStyle}>
                <a href={`/admin/noticias/form?id=${n.id}`}>
                  <button className="admin-button">Editar</button>
                </a>

                <button onClick={() => excluir(n.id)} style={excluirBtnStyle}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
