"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Depoimento = {
  id: string;
  texto: string;
  autor: string;
};

const INICIAIS: Depoimento[] = [
  {
    id: "1",
    texto:
      "“Graças à APECC, nossa escola recebeu oficinas de arte e cidadania que transformaram nossos alunos.”",
    autor: "— Diretora, Escola Municipal de Suzano",
  },
  {
    id: "2",
    texto:
      "“Os projetos da APECC resgatam a autoestima e oferecem oportunidades reais nas comunidades.”",
    autor: "— Coordenadora Social",
  },
];

export default function DepoimentosPage() {
  const [lista, setLista] = useState<Depoimento[]>(INICIAIS);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔥 CORREÇÃO: carregar do banco
  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("extra")
        .eq("pagina_slug", "home")
        .eq("bloco", "depoimentos_home")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao carregar depoimentos:", error);
      }

      const extra = (data as any)?.extra;

      if (
        extra &&
        typeof extra === "object" &&
        Array.isArray(extra.depoimentos)
      ) {
        setLista(extra.depoimentos);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  function updateItem(index: number, campo: keyof Depoimento, valor: string) {
    setLista((prev) => {
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
          bloco: "depoimentos_home",
          extra: {
            depoimentos: lista.map((d) => ({
              id: d.id,
              texto: d.texto,
              autor: d.autor,
            })),
          },
        },
        { onConflict: "pagina_slug,bloco" }
      );

    if (error) {
      console.error("Erro ao salvar Depoimentos:", error);
      setMensagem("❌ Erro ao salvar no Supabase. Veja o console.");
      return;
    }

    setMensagem("✅ Depoimentos salvos no Supabase com sucesso.");
  }

  if (loading) {
    return <div className="admin-box">Carregando...</div>;
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Depoimentos</h1>
        <p className="admin-subtitle">
          Edite as frases e os autores exibidos na seção de depoimentos.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        {lista.map((d, index) => (
          <div
            key={d.id}
            style={{
              borderBottom:
                index < lista.length - 1
                  ? "1px solid rgba(148,163,184,.4)"
                  : "none",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
              Depoimento {index + 1}
            </h2>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Texto:
              <textarea
                rows={3}
                value={d.texto}
                onChange={(e) => updateItem(index, "texto", e.target.value)}
                style={textareaStyle}
              />
            </label>

            <label style={{ fontSize: ".9rem", display: "block" }}>
              Autor:
              <input
                type="text"
                value={d.autor}
                onChange={(e) => updateItem(index, "autor", e.target.value)}
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

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};