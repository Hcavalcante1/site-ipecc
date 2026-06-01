"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/supabaseClient";

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
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 CORREÇÃO: carregar do banco
  useEffect(() => {
    async function carregar() {
      const data = await fetchPaginaConteudo(supabase, "home", "numeros", "extra");
      const extra = parsePaginaExtra<{ numeros?: Numero[] }>(data?.extra, {});

      if (extra && typeof extra === "object" && Array.isArray(extra.numeros)) {
        setNumeros(extra.numeros);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  function updateItem(index: number, campo: keyof Numero, valor: string) {
    setNumeros((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  }

  async function salvar() {
    setMensagem("Salvando...");
    setSalvando(true);

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "home",
        bloco: "numeros",
        extra: {
          numeros: numeros.map((n) => ({
            id: n.id,
            valor: n.valor,
            descricao: n.descricao,
          })),
        },
      });

      if (error) {
        console.error("Erro ao salvar Números:", error);
        setMensagem(`Erro ao salvar: ${error.message}`);
        return;
      }

      setMensagem("Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="admin-box">Carregando...</div>;
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Nossos Projetos em Números</h1>
        <p className="admin-subtitle">
          Edite os números exibidos na seção “Nossos Projetos em Números”.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
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
              Valor:
              <input
                type="text"
                value={n.valor}
                onChange={(e) => updateItem(index, "valor", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: ".9rem", display: "block" }}>
              Descrição:
              <input
                type="text"
                value={n.descricao}
                onChange={(e) => updateItem(index, "descricao", e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        ))}

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: ".85rem", color: "#bbf7d0" }}>
            {mensagem}
          </p>
        )}
      </form>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e5e7eb",
};
