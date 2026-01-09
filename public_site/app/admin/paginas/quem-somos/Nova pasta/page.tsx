"use client";

import { useState } from "react";

type Eixo = {
  id: number;
  titulo: string;
  texto: string;
};

export default function QuemSomosAtuacaoAdminPage() {
  const [titulo, setTitulo] = useState("Nossa atuação");
  const [texto, setTexto] = useState(
    "A APECC desenvolve ações em diferentes frentes, sempre com foco em educação, cultura e cidadania. Nossos eixos articulam atividades formativas, produção cultural e gestão de projetos com resultados mensuráveis e duradouros."
  );

  const [eixos, setEixos] = useState<Eixo[]>([
    {
      id: 1,
      titulo: "Formação educacional e cidadã",
      texto:
        "Oficinas, cursos e projetos em escolas públicas e espaços comunitários, com metodologias participativas, mediação cultural e foco em competências socioemocionais.",
    },
    {
      id: 2,
      titulo: "Cultura e arte para todos",
      texto:
        "Circuitos culturais, mostras, festivais e eventos de valorização da diversidade artística, ampliando o acesso e estimulando a criação local.",
    },
    {
      id: 3,
      titulo: "Gestão e apoio institucional",
      texto:
        "Elaboração, execução e monitoramento de projetos sociais e culturais em parceria com órgãos públicos e OSCs, com indicadores, prestação de contas e compromisso com resultados.",
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
    minHeight: 100,
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
      { id: novoId, titulo: "Novo eixo", texto: "Descrição do novo eixo." },
    ]);
  }

  function removeEixo(id: number) {
    setEixos((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("QUEM SOMOS ATUACAO (simulado):", {
      titulo,
      texto,
      eixos,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos — Nossa atuação</h1>
        <p className="admin-subtitle">
          Edite o texto geral de atuação e os cards dos eixos.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título do bloco:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={inputStyle}
        />

        <label style={{ marginTop: 10 }}>Texto introdutório:</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textAreaStyle}
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
          <span>Eixos cadastrados:</span>
          <button
            type="button"
            onClick={addEixo}
            className="admin-button"
            style={{ padding: "4px 10px", fontSize: ".8rem" }}
          >
            + Adicionar eixo
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
          {eixos.map((e) => (
            <div
              key={e.id}
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
                  Eixo #{e.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeEixo(e.id)}
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
                value={e.titulo}
                onChange={(ev) =>
                  updateEixo(e.id, "titulo", ev.target.value)
                }
                placeholder="Título do eixo"
                style={inputStyle}
              />

              <textarea
                rows={3}
                value={e.texto}
                onChange={(ev) =>
                  updateEixo(e.id, "texto", ev.target.value)
                }
                placeholder="Texto do eixo"
                style={textAreaStyle}
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
