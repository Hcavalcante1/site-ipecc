"use client";

import { useState } from "react";

type Etapa = {
  id: number;
  titulo: string;
  texto: string;
};

export default function ProjetosMetodologiaAdminPage() {
  const [tituloBloco, setTituloBloco] = useState("Metodologia");
  const [textoIntro, setTextoIntro] = useState(
    "Nossa metodologia é baseada em etapas simples, participativas e orientadas a resultados."
  );

  const [etapas, setEtapas] = useState<Etapa[]>([
    {
      id: 1,
      titulo: "Diagnóstico",
      texto:
        "Mapeamento de demandas, potencialidades e atores locais para compreender o território antes da intervenção.",
    },
    {
      id: 2,
      titulo: "Co-criação",
      texto:
        "Planejamento participativo com gestores, equipes técnicas e comunidade para definir metas e estratégias.",
    },
    {
      id: 3,
      titulo: "Execução",
      texto:
        "Implementação das ações com equipe qualificada, metodologias ativas e foco nos resultados pactuados.",
    },
    {
      id: 4,
      titulo: "Monitoramento",
      texto:
        "Acompanhamento contínuo com indicadores de processo, produto e resultado.",
    },
    {
      id: 5,
      titulo: "Prestação de contas",
      texto:
        "Relatórios técnicos, registros fotográficos e divulgação de resultados em transparência.",
    },
  ]);

  const [msg, setMsg] = useState("");

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
    minHeight: 90,
    resize: "vertical",
  };

  function updateEtapa(id: number, campo: keyof Etapa, valor: string) {
    setEtapas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  function addEtapa() {
    const novoId = Date.now();
    setEtapas((prev) => [
      ...prev,
      {
        id: novoId,
        titulo: "Nova etapa",
        texto: "Descrição da nova etapa.",
      },
    ]);
  }

  function removeEtapa(id: number) {
    setEtapas((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS METODOLOGIA (simulado):", {
      tituloBloco,
      textoIntro,
      etapas,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Metodologia</h1>
        <p className="admin-subtitle">
          Edite o bloco de metodologia dos projetos (título, texto introdutório e
          etapas exibidas na página pública).
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título do bloco:</label>
        <input
          value={tituloBloco}
          onChange={(e) => setTituloBloco(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>Texto introdutório:</label>
        <textarea
          value={textoIntro}
          onChange={(e) => setTextoIntro(e.target.value)}
          style={{ ...sTextarea, minHeight: 110 }}
        />

        <div
          style={{
            marginTop: 20,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: ".9rem",
          }}
        >
          <span>Etapas cadastradas:</span>

          <button
            type="button"
            onClick={addEtapa}
            className="admin-button"
            style={{ padding: "5px 12px", fontSize: ".8rem" }}
          >
            + Adicionar etapa
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {etapas.map((e) => (
            <div
              key={e.id}
              style={{
                background: "rgba(15,23,42,.9)",
                borderRadius: 12,
                padding: 14,
                border: "1px solid rgba(148,163,184,.5)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: ".8rem", opacity: 0.7 }}>
                  Etapa #{e.id}
                </span>

                <button
                  type="button"
                  onClick={() => removeEtapa(e.id)}
                  style={{
                    marginLeft: "auto",
                    background: "rgba(127,29,29,.7)",
                    border: "1px solid rgba(248,113,113,.7)",
                    borderRadius: 6,
                    padding: "3px 10px",
                    color: "#fee2e2",
                    cursor: "pointer",
                    fontSize: ".75rem",
                  }}
                >
                  Remover
                </button>
              </div>

              <label>Título da etapa:</label>
              <input
                value={e.titulo}
                onChange={(evt) =>
                  updateEtapa(e.id, "titulo", evt.target.value)
                }
                style={sInput}
              />

              <label>Texto da etapa:</label>
              <textarea
                value={e.texto}
                onChange={(evt) =>
                  updateEtapa(e.id, "texto", evt.target.value)
                }
                style={sTextarea}
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 18 }}
        >
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
