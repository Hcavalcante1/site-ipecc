"use client";

import { useState } from "react";

type Eixo = {
  id: string;
  titulo: string;
  texto: string;
};

export default function EixosAdminPage() {
  const [intro, setIntro] = useState(
    "A APECC desenvolve ações em diferentes frentes, sempre com foco em educação, cultura e cidadania."
  );
  const [eixos, setEixos] = useState<Eixo[]>([
    {
      id: "1",
      titulo: "Educação e formação",
      texto: "Projetos formativos, oficinas, cursos e ações educativas junto a escolas, comunidades e parceiros.",
    },
    {
      id: "2",
      titulo: "Cultura e produção",
      texto: "Iniciativas culturais, eventos, mostras, circulação artística e promoção do acesso à cultura.",
    },
    {
      id: "3",
      titulo: "Gestão e articulação",
      texto: "Articulação com poder público, elaboração de projetos e apoio à gestão de iniciativas sociais.",
    },
  ]);

  const [msg, setMsg] = useState("");

  function atualizarEixo(id: string, campo: "titulo" | "texto", valor: string) {
    setEixos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  function adicionarEixo() {
    const novoId = String(Date.now());
    setEixos((prev) => [
      ...prev,
      { id: novoId, titulo: "Novo eixo", texto: "Descrição do novo eixo." },
    ]);
  }

  function removerEixo(id: string) {
    setEixos((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("EIXOS (simulado):", { intro, eixos });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos – Eixos de atuação</h1>
        <p className="admin-subtitle">
          Edite o texto introdutório e os cards dos eixos de atuação.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: ".9rem",
            marginBottom: 12,
          }}
        >
          <span>Texto introdutório:</span>
          <textarea
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            fontSize: ".9rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span>Cards dos eixos:</span>
          <button
            type="button"
            onClick={adicionarEixo}
            className="admin-button"
            style={{ padding: "4px 10px", fontSize: ".8rem" }}
          >
            + Adicionar eixo
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {eixos.map((eixo) => (
            <div
              key={eixo.id}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,.6)",
                padding: 10,
                background: "rgba(15,23,42,.9)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: ".8rem", opacity: 0.7 }}>
                  Eixo #{eixo.id}
                </span>
                <button
                  type="button"
                  onClick={() => removerEixo(eixo.id)}
                  style={{
                    marginLeft: "auto",
                    borderRadius: 999,
                    border: "1px solid rgba(248,113,113,.7)",
                    background: "rgba(127,29,29,.7)",
                    color: "#fee2e2",
                    padding: "2px 10px",
                    fontSize: ".75rem",
                    cursor: "pointer",
                  }}
                >
                  Remover
                </button>
              </div>

              <input
                value={eixo.titulo}
                onChange={(e) =>
                  atualizarEixo(eixo.id, "titulo", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,.8)",
                  background: "rgba(15,23,42,.85)",
                  color: "#e5e7eb",
                  fontSize: ".9rem",
                }}
                placeholder="Título do eixo"
              />

              <textarea
                rows={3}
                value={eixo.texto}
                onChange={(e) =>
                  atualizarEixo(eixo.id, "texto", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,.8)",
                  background: "rgba(15,23,42,.85)",
                  color: "#e5e7eb",
                  resize: "vertical",
                  fontSize: ".9rem",
                }}
                placeholder="Texto do eixo"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 16 }}
        >
          Salvar alterações
        </button>

        {msg && (
          <p
            style={{
              marginTop: 10,
              fontSize: ".85rem",
              color: "#bbf7d0",
            }}
          >
            {msg}
          </p>
        )}
      </form>
    </>
  );
}
