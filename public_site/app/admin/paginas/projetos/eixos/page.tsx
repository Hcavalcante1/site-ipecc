"use client";

import { useState } from "react";

type Eixo = {
  id: number;
  titulo: string;
  texto: string;
};

export default function ProjetosEixosAdminPage() {
  // Conteúdo inicial baseado no seu site real
  const [titulo, setTitulo] = useState("Eixos de Atuação");
  const [descricao, setDescricao] = useState(
    "Os projetos da APECC se organizam em eixos estratégicos que conectam educação, cultura e cidadania de forma integrada, garantindo ações sólidas, contínuas e alinhadas às necessidades dos territórios."
  );

  const [eixos, setEixos] = useState<Eixo[]>([
    {
      id: 1,
      titulo: "Educação e Desenvolvimento Humano",
      texto:
        "Projetos voltados para escolas, professores, estudantes e comunidades, com foco em aprendizagem, participação e fortalecimento de vínculos sociais.",
    },
    {
      id: 2,
      titulo: "Cultura, Arte e Expressão",
      texto:
        "Ações culturais que incentivam a produção local, a diversidade artística e o acesso à cultura como direito de cidadania.",
    },
    {
      id: 3,
      titulo: "Cidadania e Fortalecimento Comunitário",
      texto:
        "Iniciativas que promovem participação social, autonomia e criação de redes comunitárias que sustentam o desenvolvimento territorial.",
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
    minHeight: 100,
    resize: "vertical",
  };

  function updateEixo(id: number, campo: keyof Eixo, valor: string) {
    setEixos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  function addEixo() {
    const novoId = Date.now();
    setEixos((prev) => [
      ...prev,
      {
        id: novoId,
        titulo: "Novo eixo",
        texto: "Descrição do novo eixo.",
      },
    ]);
  }

  function removeEixo(id: number) {
    setEixos((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS EIXOS (simulado):", { titulo, descricao, eixos });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Eixos Temáticos</h1>
        <p className="admin-subtitle">
          Edite os eixos de atuação (cada card com título e texto).
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>

        <label>Título geral do bloco:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>Descrição do bloco:</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={sTextarea}
        />

        {/* LISTA DE EIXOS */}
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
          <span>Eixos cadastrados:</span>

          <button
            type="button"
            onClick={addEixo}
            className="admin-button"
            style={{ padding: "5px 12px", fontSize: ".8rem" }}
          >
            + Adicionar eixo
          </button>
        </div>

        {/* CARDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {eixos.map((eixo) => (
            <div
              key={eixo.id}
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
                  Eixo #{eixo.id}
                </span>

                <button
                  type="button"
                  onClick={() => removeEixo(eixo.id)}
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

              <label>Título do eixo:</label>
              <input
                value={eixo.titulo}
                onChange={(e) =>
                  updateEixo(eixo.id, "titulo", e.target.value)
                }
                style={sInput}
              />

              <label>Descrição:</label>
              <textarea
                value={eixo.texto}
                onChange={(e) =>
                  updateEixo(eixo.id, "texto", e.target.value)
                }
                style={sTextarea}
              />
            </div>
          ))}
        </div>

        <button className="admin-button" style={{ marginTop: 18 }}>
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
