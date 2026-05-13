"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [loading, setLoading] = useState(true);

  // 🔥 CORREÇÃO: carregar do banco
  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("extra")
        .eq("pagina_slug", "home")
        .eq("bloco", "numeros")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao carregar números:", error);
      }

      const extra = (data as any)?.extra;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "home",
          bloco: "numeros",
          extra: {
            numeros: numeros.map((n) => ({
              id: n.id,
              valor: n.valor,
              descricao: n.descricao,
            })),
          },
        },
        { onConflict: "pagina_slug,bloco" }
      );

    if (error) {
      console.error("Erro ao salvar Números:", error);
      setMensagem("❌ Erro ao salvar no Supabase. Veja o console.");
      return;
    }

    setMensagem("✅ Números salvos no Supabase com sucesso.");
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

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e5e7eb",
};
