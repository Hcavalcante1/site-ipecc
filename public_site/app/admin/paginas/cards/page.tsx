"use client";

import { useState } from "react";

type Card = {
  id: string;
  titulo: string;
  texto: string;
  linkTexto: string;
  linkUrl: string;
  imagem: string;
};

const INICIAIS: Card[] = [
  {
    id: "projetos",
    titulo: "Projetos",
    texto:
      "Conheça nossas iniciativas e resultados nas áreas de educação, cultura, cidadania e desenvolvimento social.",
    linkTexto: "Ver projetos",
    linkUrl: "/projetos",
    imagem: "/media/projetos.jpg",
  },
  {
    id: "transparencia",
    titulo: "Transparência",
    texto:
      "Acompanhe editais, contratos, termos de parceria e relatórios institucionais.",
    linkTexto: "Acesso à transparência",
    linkUrl: "/transparencia",
    imagem: "/media/transparencia.jpg",
  },
  {
    id: "contato",
    titulo: "Contato",
    texto:
      "Fale conosco para parcerias, informações institucionais ou atendimento.",
    linkTexto: "Fale com a APECC",
    linkUrl: "/contato",
    imagem: "/media/contato.jpg",
  },
];

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>(INICIAIS);
  const [mensagem, setMensagem] = useState("");

  function updateCard(index: number, campo: keyof Card, valor: string) {
    setCards((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Cards principais:", cards);
    setMensagem(
      "Alterações dos cards salvas (simulado). Depois vamos enviar isso para o Firebase."
    );
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Cards Principais</h1>
        <p className="admin-subtitle">
          Edite aqui os 3 cards da seção “Projetos / Transparência / Contato”.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            style={{
              borderBottom:
                index < cards.length - 1 ? "1px solid rgba(148,163,184,.4)" : "none",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
              Card {index + 1}: {card.titulo}
            </h2>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Título:
              <input
                type="text"
                value={card.titulo}
                onChange={(e) => updateCard(index, "titulo", e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,.8)",
                  background: "rgba(15,23,42,.85)",
                  color: "#e5e7eb",
                }}
              />
            </label>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Texto:
              <textarea
                rows={3}
                value={card.texto}
                onChange={(e) => updateCard(index, "texto", e.target.value)}
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
            </label>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label style={{ fontSize: ".9rem" }}>
                Texto do link:
                <input
                  type="text"
                  value={card.linkTexto}
                  onChange={(e) => updateCard(index, "linkTexto", e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,.8)",
                    background: "rgba(15,23,42,.85)",
                    color: "#e5e7eb",
                  }}
                />
              </label>

              <label style={{ fontSize: ".9rem" }}>
                URL do link:
                <input
                  type="text"
                  value={card.linkUrl}
                  onChange={(e) => updateCard(index, "linkUrl", e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,.8)",
                    background: "rgba(15,23,42,.85)",
                    color: "#e5e7eb",
                  }}
                />
              </label>
            </div>

            <label style={{ fontSize: ".9rem", display: "block", marginTop: 8 }}>
              Caminho da imagem (em /public/media):
              <input
                type="text"
                value={card.imagem}
                onChange={(e) => updateCard(index, "imagem", e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,.8)",
                  background: "rgba(15,23,42,.85)",
                  color: "#e5e7eb",
                }}
              />
            </label>
          </div>
        ))}

        <button type="submit" className="admin-button">
          Salvar alterações
        </button>

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: ".85rem", color: "#bbf7d0" }}>
            {mensagem}
          </p>
        )}
      </form>
    </>
  );
}
