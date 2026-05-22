"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ===== BOTÕES PADRÃO ===== */
const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnRed = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

/* ===== TIPOS ===== */
type Item = {
  label: string;
  valor: string;
  tipo: "email" | "texto" | "link";
};

type Card = {
  titulo: string;
  descricao: string;
  itens: Item[];
};

type CanaisData = {
  titulo: string;
  cards: Card[];
};

/* ===== SANITIZAÇÃO ===== */
function sanitizeCanais(input: CanaisData): CanaisData {
  return {
    titulo: input.titulo.trim() || "Canais oficiais",
    cards: input.cards
      .map((card) => ({
        titulo: card.titulo.trim(),
        descricao: card.descricao.trim(),
        itens: card.itens.filter(
          (i) => i.label.trim() && i.valor.trim()
        ),
      }))
      .filter((card) => card.titulo),
  };
}

export default function ContatoCanaisAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [data, setData] = useState<CanaisData>({
    titulo: "",
    cards: [],
  });

  /* ===== LOAD - merge seguro ===== */
  useEffect(() => {
    async function load() {
      const { data: db } = await supabase
        .from("paginas")
        .select("canais_oficiais")
        .eq("slug", "contato")
        .single();

      if (db?.canais_oficiais) {
        const dbCards = Array.isArray(db.canais_oficiais.cards)
          ? db.canais_oficiais.cards
          : [];

        setData({
          titulo: db.canais_oficiais.titulo ?? "Canais Oficiais",
          cards: dbCards.map((card: any) => ({
            titulo: card.titulo || "",
            descricao: card.descricao || "",
            itens: Array.isArray(card.itens) ? card.itens : [],
          })),
        });
      }

      setLoading(false);
    }

    load();
  }, []);

  /* ===== SAVE ===== */
  async function salvar() {
    setMsg("Salvando...");

    const payload = sanitizeCanais(data);

    const { error } = await supabase
      .from("paginas")
      .update({
        canais_oficiais: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "contato");

    setMsg(error ? `Erro ao salvar: ${error.message}` : "Alterações salvas com sucesso.");
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Contato — Canais Oficiais</h1>
      <p>Gerencie os canais de contato exibidos na página pública.</p>

      <label>Título da seção</label>
      <input
        value={data.titulo}
        onChange={(e) =>
          setData({ ...data, titulo: e.target.value })
        }
      />

      <hr />

      {data.cards.map((card, ci) => (
        <div key={ci} className="admin-card" style={{ marginTop: 16 }}>
          <label>Título do card</label>
          <input
            value={card.titulo}
            onChange={(e) => {
              const cp = [...data.cards];
              cp[ci].titulo = e.target.value;
              setData({ ...data, cards: cp });
            }}
          />

          <label>Descrição</label>
          <textarea
            rows={3}
            value={card.descricao}
            onChange={(e) => {
              const cp = [...data.cards];
              cp[ci].descricao = e.target.value;
              setData({ ...data, cards: cp });
            }}
          />

          {card.itens.map((item, ii) => (
            <div key={ii} style={{ marginTop: 12 }}>
              <label>Label</label>
              <input
                value={item.label}
                onChange={(e) => {
                  const cp = [...data.cards];
                  cp[ci].itens[ii].label = e.target.value;
                  setData({ ...data, cards: cp });
                }}
              />

              <label>Valor</label>
              <input
                value={item.valor}
                onChange={(e) => {
                  const cp = [...data.cards];
                  cp[ci].itens[ii].valor = e.target.value;
                  setData({ ...data, cards: cp });
                }}
              />

              <label>Tipo</label>
              <select
                value={item.tipo}
                onChange={(e) => {
                  const cp = [...data.cards];
                  cp[ci].itens[ii].tipo = e.target.value as any;
                  setData({ ...data, cards: cp });
                }}
              >
                <option value="email">E-mail</option>
                <option value="texto">Texto</option>
                <option value="link">Link</option>
              </select>

              <button
                type="button"
                style={btnRed}
                onClick={() => {
                  const cp = [...data.cards];
                  cp[ci].itens.splice(ii, 1);
                  setData({ ...data, cards: cp });
                }}
              >
                Remover item
              </button>
            </div>
          ))}

          <button
            type="button"
            style={btnGreen}
            onClick={() => {
              const cp = [...data.cards];
              cp[ci].itens.push({ label: "", valor: "", tipo: "texto" });
              setData({ ...data, cards: cp });
            }}
          >
            + Adicionar item
          </button>

          <button
            type="button"
            style={btnRed}
            onClick={() => {
              const cp = [...data.cards];
              cp.splice(ci, 1);
              setData({ ...data, cards: cp });
            }}
          >
            Remover card
          </button>
        </div>
      ))}

      <button
        type="button"
        style={btnGreen}
        onClick={() =>
          setData({
            ...data,
            cards: [...data.cards, { titulo: "", descricao: "", itens: [] }],
          })
        }
      >
        + Adicionar card
      </button>

      <hr />

      <button style={btnGreen} onClick={salvar}>
        Salvar alterações
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}


