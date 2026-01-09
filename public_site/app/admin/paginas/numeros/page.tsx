// app/admin/paginas/numeros/page.tsx
"use client";

import { useState } from "react";

type Numero = {
  id: string;
  valor: string;
  descricao: string;
};

const INICIAIS: Numero[] = [
  { id: "projetos", valor: "+120", descricao: "Projetos Realizados" },
  { id: "municipios", valor: "35", descricao: "Municípios Atendidos" },
  { id: "pessoas", valor: "50.000+", descricao: "Pessoas Impactadas" },
  { id: "parceiros", valor: "300+", descricao: "Parceiros Envolvidos" },
];

export default function NumerosPage() {
  const [numeros, setNumeros] = useState<Numero[]>(INICIAIS);
  const [mensagem, setMensagem] = useState("");

  function updateItem(index: number, campo: keyof Numero, valor: string) {
    setNumeros((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Números:", numeros);
    setMensagem(
      "Alterações dos números salvas (simulado). Depois vamos enviar isso para o Firebase."
    );
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Nossos Projetos em Números</h1>
        <p className="admin-subtitle">
          Edite os números exibidos na seção “Nossos Projetos em Números”.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        {numeros.map((n, index) => (
          <div
            key={n.id}
            style={{
              borderBottom:
                index < numeros.length - 1
                  ? "1px solid rgba(148,163,184,.4)"
                  : "none",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
              Bloco {index + 1}
            </h2>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Valor (ex: +120, 50.000+):
              <input
                type="text"
                value={n.valor}
                onChange={(e) => updateItem(index, "valor", e.target.value)}
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

            <label style={{ fontSize: ".9rem", display: "block" }}>
              Descrição:
              <input
                type="text"
                value={n.descricao}
                onChange={(e) =>
                  updateItem(index, "descricao", e.target.value)
                }
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
