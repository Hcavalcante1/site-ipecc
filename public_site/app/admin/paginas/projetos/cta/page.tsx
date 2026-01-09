"use client";

import { useState } from "react";

export default function ProjetosCtaAdminPage() {
  const [tituloBloco, setTituloBloco] = useState("Parcerias e editais");
  const [textoPrincipal, setTextoPrincipal] = useState(
    "Atuamos com Termo de Colaboração, convênios, patrocínios e cooperações técnicas. Se a sua instituição busca um parceiro qualificado para execução de políticas públicas e projetos socioculturais, fale com a APECC."
  );

  const [tituloCta, setTituloCta] = useState("Vamos construir juntos");
  const [textoCta, setTextoCta] = useState(
    "Apresente sua demanda, edital ou proposta de parceria."
  );
  const [rotuloBotao, setRotuloBotao] = useState("Fale com a APECC");
  const [linkBotao, setLinkBotao] = useState("/contato");

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS CTA (simulado):", {
      tituloBloco,
      textoPrincipal,
      tituloCta,
      textoCta,
      rotuloBotao,
      linkBotao,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos - CTA </h1>
        <p className="admin-subtitle">
          Edite o bloco final de chamada para ação da página /projetos
          (parcerias, editais e botão de contato).
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título do bloco (esquerda):</label>
        <input
          value={tituloBloco}
          onChange={(e) => setTituloBloco(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>Texto principal (esquerda):</label>
        <textarea
          value={textoPrincipal}
          onChange={(e) => setTextoPrincipal(e.target.value)}
          style={{ ...sTextarea, minHeight: 120 }}
        />

        <hr
          style={{
            margin: "20px 0",
            border: "none",
            borderTop: "1px solid rgba(148,163,184,.4)",
          }}
        />

        <label>Título da caixa de destaque (direita):</label>
        <input
          value={tituloCta}
          onChange={(e) => setTituloCta(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>
          Texto da caixa de destaque (direita):
        </label>
        <textarea
          value={textoCta}
          onChange={(e) => setTextoCta(e.target.value)}
          style={{ ...sTextarea, minHeight: 100 }}
        />

        <label style={{ marginTop: 10 }}>Rótulo do botão:</label>
        <input
          value={rotuloBotao}
          onChange={(e) => setRotuloBotao(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>Link do botão (URL ou rota):</label>
        <input
          value={linkBotao}
          onChange={(e) => setLinkBotao(e.target.value)}
          style={sInput}
        />

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
