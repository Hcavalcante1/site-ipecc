"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  publicado: boolean;
  created_at: string;
};

export default function NoticiasAdmin() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarNoticias() {
    const { data } = await supabase
      .from("noticias")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setNoticias(data);
    setLoading(false);
  }

  async function excluir(id: string) {
    const confirmar = confirm("Deseja excluir esta notícia?");
    if (!confirmar) return;

    await supabase.from("noticias").delete().eq("id", id);
    carregarNoticias();
  }

  useEffect(() => {
    carregarNoticias();
  }, []);

  return (
    <>
      <h1 className="admin-h1">Notícias</h1>
      <p className="admin-subtitle">Gerencie as notícias do site.</p>

      <div style={{ marginTop: 16 }}>
        <a href="/admin/noticias/form">
          <button className="admin-button">+ Nova notícia</button>
        </a>
      </div>

      {loading ? (
        <p style={{ marginTop: 20 }}>Carregando...</p>
      ) : (
        <div className="admin-grid" style={{ marginTop: 20 }}>
          {noticias.map((n) => (
            <div key={n.id} className="admin-card">
              <h3>{n.titulo}</h3>
              <p style={{ fontSize: 13, opacity: 0.8 }}>
                {n.resumo}
              </p>

              <p style={{ fontSize: 12, marginTop: 8 }}>
                {n.publicado ? "🟢 Publicado" : "🔴 Rascunho"}
              </p>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <a href={`/admin/noticias/form?id=${n.id}`}>
                  <button className="admin-button">Editar</button>
                </a>

                <button
                  onClick={() => excluir(n.id)}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
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