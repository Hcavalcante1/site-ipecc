"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Bloco = {
  pagina_slug: string;
  bloco: string;
  titulo: string;
  texto: string;
  imagem_url?: string;
};

function normalizeImage(input: string) {
  if (!input) return "";
  try {
    if (input.startsWith("http")) {
      const parts = input.split("/");
      return parts[parts.length - 1];
    }
    return input.replace(/^\/?media\//, "");
  } catch {
    return input;
  }
}

export default function QuemSomosAtuacaoAdminPage() {
  const PAGINA = "quem-somos";

  const [intro, setIntro] = useState("");

  const [card1, setCard1] = useState("");
  const [card2, setCard2] = useState("");
  const [card3, setCard3] = useState("");

  const [img1, setImg1] = useState("");
  const [img2, setImg2] = useState("");
  const [img3, setImg3] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("bloco, texto, imagem_url")
        .eq("pagina_slug", PAGINA);

      if (error || !data) {
        setLoading(false);
        return;
      }

      data.forEach((item) => {
        if (item.bloco === "atuacao_intro") setIntro(item.texto || "");

        if (item.bloco === "atuacao_cards_1") {
          setCard1(item.texto || "");
          setImg1(normalizeImage(item.imagem_url || ""));
        }

        if (item.bloco === "atuacao_cards_2") {
          setCard2(item.texto || "");
          setImg2(normalizeImage(item.imagem_url || ""));
        }

        if (item.bloco === "atuacao_cards_3") {
          setCard3(item.texto || "");
          setImg3(normalizeImage(item.imagem_url || ""));
        }
      });

      setLoading(false);
    }

    load();
  }, []);

  async function salvar() {
    setMsg("Salvando...");

    try {
      const payload: Bloco[] = [
        {
          pagina_slug: PAGINA,
          bloco: "atuacao_intro",
          titulo: "Nossa atuação",
          texto: intro,
        },
        {
          pagina_slug: PAGINA,
          bloco: "atuacao_cards_1",
          titulo: "Formação educacional e cidadã",
          texto: card1,
          imagem_url: normalizeImage(img1),
        },
        {
          pagina_slug: PAGINA,
          bloco: "atuacao_cards_2",
          titulo: "Cultura e arte para todos",
          texto: card2,
          imagem_url: normalizeImage(img2),
        },
        {
          pagina_slug: PAGINA,
          bloco: "atuacao_cards_3",
          titulo: "Gestão e apoio institucional",
          texto: card3,
          imagem_url: normalizeImage(img3),
        },
      ];

      const { error } = await supabase
        .from("paginas_conteudo")
        .upsert(payload, {
          onConflict: "pagina_slug,bloco",
        });

      if (error) throw error;

      setMsg("Conteúdo salvo com sucesso");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar");
    }
  }

  if (loading) {
    return <p style={{ padding: 24 }}>Carregando…</p>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Eixos de Atuação — Quem Somos</h1>

      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Informe apenas o nome do arquivo existente em
        <code> /public/media</code>.
      </p>

      <h3>Texto introdutório</h3>
      <textarea
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 32 }}
      />

      <h3>Eixo 1 — Formação educacional e cidadã</h3>
      <input
        value={img1}
        onChange={(e) => setImg1(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <textarea
        value={card1}
        onChange={(e) => setCard1(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 32 }}
      />

      <h3>Eixo 2 — Cultura e arte para todos</h3>
      <input
        value={img2}
        onChange={(e) => setImg2(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <textarea
        value={card2}
        onChange={(e) => setCard2(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 32 }}
      />

      <h3>Eixo 3 — Gestão e apoio institucional</h3>
      <input
        value={img3}
        onChange={(e) => setImg3(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <textarea
        value={card3}
        onChange={(e) => setCard3(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 32 }}
      />

      <button
        onClick={salvar}
        style={{
          background: "#22c55e",
          color: "#062e1b",
          border: "none",
          borderRadius: 999,
          padding: "10px 24px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Salvar
      </button>

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  );
}
