"use client";

import { useState } from "react";

type Projeto = {
  id: number;
  titulo: string;
  resumo: string;
  link: string;
};

export default function ProjetosListaAdminPage() {
  const [intro, setIntro] = useState(
    "A APECC desenvolve diferentes projetos em andamento e já realizados, em áreas como educação, cultura, esporte, inclusão social e fortalecimento comunitário."
  );

  const [projetos, setProjetos] = useState<Projeto[]>([
    {
      id: 1,
      titulo: "Projeto Valer Mais",
      resumo:
        "Ações de valorização da educação pública, apoio pedagógico e mobilização de comunidade escolar.",
      link: "/projetos/valer-mais",
    },
    {
      id: 2,
      titulo: "Parcerias Institucionais",
      resumo:
        "Projetos desenvolvidos em cooperação com órgãos públicos e outras organizações da sociedade civil.",
      link: "/projetos/parcerias-institucionais",
    },
    {
      id: 3,
      titulo: "Cultura e Inclusão Social",
      resumo:
        "Circuitos culturais, oficinas artísticas e ações de inclusão sociocultural em territórios diversos.",
      link: "/projetos/cultura-inclusao-social",
    },
  ]);

  const [msg, setMsg] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,.8)",
    background: "rgba(15,23,42,.85)",
    color: "#e6edf3",
    fontSize: ".9rem",
  };

  const textAreaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 90,
  };

  function updateProjeto(id: number, campo: keyof Projeto, valor: string) {
    setProjetos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  }

  function addProjeto() {
    const novoId = Date.now();
    setProjetos((prev) => [
      ...prev,
      {
        id: novoId,
        titulo: "Novo projeto",
        resumo: "Descrição resumida do novo projeto.",
        link: "/projetos",
      },
    ]);
  }

  function removeProjeto(id: number) {
    setProjetos((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS LISTA (simulado):", { intro, projetos });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Lista de projetos</h1>
        <p className="admin-subtitle">
          Edite o texto introdutório e os cards com nome, resumo e link de cada
          projeto.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Texto introdutório:</label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 120 }}
        />

        <div
          style={{
            fontSize: ".9rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          <span>Projetos cadastrados:</span>
          <button
            type="button"
            onClick={addProjeto}
            className="admin-button"
            style={{ padding: "4px 10px", fontSize: ".8rem" }}
          >
            + Adicionar projeto
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {projetos.map((p) => (
            <div
              key={p.id}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: ".8rem", opacity: 0.7 }}>
                  Projeto #{p.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeProjeto(p.id)}
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

              <label>Título do projeto:</label>
              <input
                value={p.titulo}
                onChange={(e) =>
                  updateProjeto(p.id, "titulo", e.target.value)
                }
                style={inputStyle}
              />

              <label>Resumo:</label>
              <textarea
                value={p.resumo}
                onChange={(e) =>
                  updateProjeto(p.id, "resumo", e.target.value)
                }
                style={textAreaStyle}
              />

              <label>Link (URL da página do projeto):</label>
              <input
                value={p.link}
                onChange={(e) => updateProjeto(p.id, "link", e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button type="submit" className="admin-button">
          Salvar alterações
        </button>

        {msg && (
          <p style={{ marginTop: 10, color: "#bbf7d0", fontSize: ".8rem" }}>
            {msg}
          </p>
        )}
      </form>
    </>
  );
}
