"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

type Edital = {
  id: string;
  titulo: string;
  status: string;
  arquivo_pdf: string | null;
  created_at: string;
};

export default function MuralEditaisAdmin() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarEditais() {
    const { data, error } = await supabase
      .from("editais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setEditais(data || []);
    setLoading(false);
  }

  async function excluir(id: string) {
    if (!confirm("Deseja excluir este edital?")) return;

    await supabase.from("editais").delete().eq("id", id);
    carregarEditais();
  }

  function getUrlPdf(arquivoPdf: string | null) {
    if (!arquivoPdf) return "";

    return supabase.storage
      .from("editais")
      .getPublicUrl(arquivoPdf).data.publicUrl;
  }

  useEffect(() => {
    carregarEditais();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1
        style={{
          fontSize: 30,
          marginBottom: 25,
          fontWeight: 700,
        }}
      >
        Mural de Editais
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 26,
        }}
      >
        {editais.map((edital) => {
          const urlPdf = getUrlPdf(edital.arquivo_pdf);

          const corStatus =
            edital.status === "aberto"
              ? "#22c55e"
              : edital.status === "encerrado"
              ? "#ef4444"
              : "#eab308";

          return (
            <div
              key={edital.id}
              style={{
                background: "linear-gradient(145deg, #0f172a, #020617)",
                borderRadius: 20,
                padding: 26,
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                transition: "all 0.25s ease",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 30px 60px rgba(0,0,0,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 20px 40px rgba(0,0,0,0.6)";
              }}
            >
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                {edital.titulo}
              </h2>

              <span
                style={{
                  background: corStatus,
                  color: "#022c22",
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-block",
                  marginBottom: 10,
                }}
              >
                {edital.status}
              </span>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.6,
                }}
              >
                {new Date(edital.created_at).toLocaleDateString()}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                {urlPdf ? (
                  <a
                    href={urlPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#22c55e",
                      color: "#022c22",
                      padding: "8px 16px",
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: "none",
                      transition: "0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.85")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.opacity = "1")
                    }
                  >
                    PDF
                  </a>
                ) : (
                  <span
                    style={{
                      background: "#334155",
                      color: "#cbd5e1",
                      padding: "8px 16px",
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Sem PDF
                  </span>
                )}

                <button
                  onClick={() =>
                    (window.location.href =
                      adminCanonicalRoutes.editaisCadastro.editar(edital.id))
                  }
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.85")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = "1")
                  }
                >
                  Editar
                </button>

                <button
                  onClick={() => excluir(edital.id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.85")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = "1")
                  }
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
