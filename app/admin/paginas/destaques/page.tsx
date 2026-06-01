"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/supabaseClient";

type Destaque = {
  id: string;
  titulo: string;
  texto: string;
  linkTexto: string;
  linkUrl: string;
  imagem: string;
};

const INICIAIS: Destaque[] = [
  {
    id: "festival",
    titulo: "Festival Cultural APECC",
    texto:
      "Apresentações artísticas, oficinas e atividades educativas em parceria com escolas e OSCs locais.",
    linkTexto: "Saiba mais",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/evento-cultural.jpg",
  },
  {
    id: "oficinas",
    titulo: "Oficinas de Educação Cidadã",
    texto:
      "Capacitação de jovens e adultos com foco em cidadania, sustentabilidade e participação social.",
    linkTexto: "Ver detalhes",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/oficina-educacao.jpg",
  },
  {
    id: "acao",
    titulo: "Ação Social Itinerante",
    texto:
      "Atendimento gratuito e oficinas integradas em bairros periféricos com apoio de voluntários e parceiros.",
    linkTexto: "Ver ação",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/acao-social.jpg",
  },
];

export default function DestaquesPage() {
  const [destaques, setDestaques] = useState<Destaque[]>(INICIAIS);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 CORREÇÃO: carregar do banco
  useEffect(() => {
    async function carregar() {
      const data = await fetchPaginaConteudo(supabase, "home", "destaques", "extra");
      const extra = parsePaginaExtra<{ destaques?: Destaque[] }>(data?.extra, {});

      if (extra && typeof extra === "object" && Array.isArray(extra.destaques)) {
        setDestaques(extra.destaques);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  function updateItem(index: number, campo: keyof Destaque, valor: string) {
    setDestaques((prev) => {
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
      bloco: "destaques",
      extra: {
        destaques: destaques.map((d) => ({
          id: d.id,
          titulo: d.titulo,
          texto: d.texto,
          linkTexto: d.linkTexto,
          linkUrl: d.linkUrl,
          imagem: d.imagem,
        })),
      },
    });

    if (error) {
      console.error("Erro ao salvar destaques:", error);
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
        <h1 className="admin-title">Home – Destaques da Semana</h1>
        <p className="admin-subtitle">
          Edite aqui as três ações em destaque exibidas na seção “Destaques da
          Semana”.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {destaques.map((d, index) => (
          <div
            key={d.id}
            style={{
              borderBottom:
                index < destaques.length - 1
                  ? "1px solid rgba(148,163,184,.4)"
                  : "none",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
              Destaque {index + 1}: {d.titulo}
            </h2>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Título:
              <input
                type="text"
                value={d.titulo}
                onChange={(e) => updateItem(index, "titulo", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
              Texto:
              <textarea
                rows={3}
                value={d.texto}
                onChange={(e) => updateItem(index, "texto", e.target.value)}
                style={textareaStyle}
              />
            </label>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label style={{ fontSize: ".9rem" }}>
                Texto do botão:
                <input
                  type="text"
                  value={d.linkTexto}
                  onChange={(e) =>
                    updateItem(index, "linkTexto", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: ".9rem" }}>
                URL do botão:
                <input
                  type="text"
                  value={d.linkUrl}
                  onChange={(e) => updateItem(index, "linkUrl", e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={{ fontSize: ".9rem", display: "block", marginTop: 8 }}>
              Caminho da imagem:
              <input
                type="text"
                value={d.imagem}
                onChange={(e) => updateItem(index, "imagem", e.target.value)}
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

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};