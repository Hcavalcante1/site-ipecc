"use client";

import { useState } from "react";

type Resultado = {
  id: number;
  valor: string;
  rotulo: string;
};

export default function ProjetosResultadosAdminPage() {
  const [tituloBloco, setTituloBloco] = useState("Resultados");
  const [textoIntro, setTextoIntro] = useState(
    "Indicadores sintéticos que mostram o alcance e o impacto dos projetos da APECC."
  );

  const [resultados, setResultados] = useState<Resultado[]>([
    {
      id: 1,
      valor: "+120",
      rotulo: "Projetos realizados",
    },
    {
      id: 2,
      valor: "35",
      rotulo: "Municípios atendidos",
    },
    {
      id: 3,
      valor: "50.000+",
      rotulo: "Pessoas impactadas",
    },
    {
      id: 4,
      valor: "300+",
      rotulo: "Parceiros envolvidos",
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

  function updateResultado(id: number, campo: keyof Resultado, valor: string) {
    setResultados((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
    );
  }

  function addResultado() {
    const novoId = Date.now();
    setResultados((prev) => [
      ...prev,
      {
        id: novoId,
        valor: "0",
        rotulo: "Novo indicador",
      },
    ]);
  }

  function removeResultado(id: number) {
    setResultados((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS RESULTADOS (simulado):", {
      tituloBloco,
      textoIntro,
      resultados,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Resultados e Números </h1>
        <p className="admin-subtitle">
          Edite o bloco de resultados numéricos exibido na página pública
          /projetos.
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
          <span>Resultados cadastrados:</span>

          <button
            type="button"
            onClick={addResultado}
            className="admin-button"
            style={{ padding: "5px 12px", fontSize: ".8rem" }}
          >
            + Adicionar resultado
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {resultados.map((r) => (
            <div
              key={r.id}
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
                  Resultado #{r.id}
                </span>

                <button
                  type="button"
                  onClick={() => removeResultado(r.id)}
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

              <label>Valor (número exibido):</label>
              <input
                value={r.valor}
                onChange={(e) =>
                  updateResultado(r.id, "valor", e.target.value)
                }
                style={sInput}
              />

              <label>Rótulo (descrição abaixo do número):</label>
              <input
                value={r.rotulo}
                onChange={(e) =>
                  updateResultado(r.id, "rotulo", e.target.value)
                }
                style={sInput}
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

