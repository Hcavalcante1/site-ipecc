"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/supabaseClient";

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
    imagem: "/media/home/cards/projetos.jpg",
  },
  {
    id: "transparencia",
    titulo: "Transparência",
    texto:
      "Acompanhe editais, contratos, termos de parceria e relatórios institucionais.",
    linkTexto: "Acesso à transparência",
    linkUrl: "/transparencia",
    imagem: "/media/home/cards/transparencia.jpg",
  },
  {
    id: "contato",
    titulo: "Contato",
    texto:
      "Fale conosco para parcerias, informações institucionais ou atendimento.",
    linkTexto: "Fale com o IPECCC",
    linkUrl: "/contato",
    imagem: "/media/home/cards/contato.jpg",
  },
];

const PAGINA_SLUG = "home";
const BLOCO = "cards_principais";

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>(INICIAIS);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function carregar() {
      setMensagem("");
      setLoading(true);

      const data = await fetchPaginaConteudo(
        supabase,
        PAGINA_SLUG,
        BLOCO,
        "extra"
      );

      if (!mounted) return;
      const extra = parsePaginaExtra<{ cards?: Card[] }>(data?.extra, {});

      // ✅ CORREÇÃO: validação segura da estrutura
      if (extra && typeof extra === "object" && Array.isArray(extra.cards)) {
        setCards(extra.cards as Card[]);
      }

      setLoading(false);
    }

    carregar();
    return () => {
      mounted = false;
    };
  }, []);

  function updateCard(index: number, campo: keyof Card, valor: string) {
    setCards((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  }

  async function salvar() {
    setMensagem("");
    setSalvando(true);

    if (!cards || cards.length !== 3) {
      setMensagem("Erro: precisa haver exatamente 3 cards.");
      setSalvando(false);
      return;
    }

    // ✅ CORREÇÃO: garante estrutura limpa no banco
    const payload = {
      pagina_slug: PAGINA_SLUG,
      bloco: BLOCO,
      extra: {
        cards: cards.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          texto: c.texto,
          linkTexto: c.linkTexto,
          linkUrl: c.linkUrl,
          imagem: c.imagem,
        })),
      },
    };

    const { error } = await upsertPaginaConteudo(supabase, payload);

    if (error) {
      console.error("Erro ao salvar cards:", error);
      setMensagem(`Erro ao salvar: ${error.message}`);
      setSalvando(false);
      return;
    }

    setMensagem("Salvo com sucesso.");
    setSalvando(false);
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Cards Principais</h1>
        <p className="admin-subtitle">
          Edite aqui os 3 cards da seção “Projetos / Transparência / Contato”.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {loading ? (
          <p style={{ margin: 0, color: "#e5e7eb" }}>Carregando…</p>
        ) : (
          <>
            {cards.map((card, index) => (
              <div
                key={card.id}
                style={{
                  borderBottom:
                    index < cards.length - 1
                      ? "1px solid rgba(148,163,184,.4)"
                      : "none",
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
                    style={inputStyle}
                  />
                </label>

                <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
                  Texto:
                  <textarea
                    rows={3}
                    value={card.texto}
                    onChange={(e) => updateCard(index, "texto", e.target.value)}
                    style={textareaStyle}
                  />
                </label>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <label style={{ fontSize: ".9rem" }}>
                    Texto do link:
                    <input
                      type="text"
                      value={card.linkTexto}
                      onChange={(e) => updateCard(index, "linkTexto", e.target.value)}
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ fontSize: ".9rem" }}>
                    URL do link:
                    <input
                      type="text"
                      value={card.linkUrl}
                      onChange={(e) => updateCard(index, "linkUrl", e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={{ fontSize: ".9rem", display: "block", marginTop: 8 }}>
                  Caminho da imagem:
                  <input
                    type="text"
                    value={card.imagem}
                    onChange={(e) => updateCard(index, "imagem", e.target.value)}
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
          </>
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