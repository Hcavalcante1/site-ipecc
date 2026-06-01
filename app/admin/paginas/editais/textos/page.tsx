"use client";

import { useEffect, useState } from "react";
import { supabase, upsertPaginaConteudo } from "@/lib/supabaseClient";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

type Bloco = {
  id?: string;
  pagina_slug: string;
  bloco: string;
  titulo: string;
  texto: string;
};

export default function EditaisTextosPage() {
  const [dados, setDados] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  // ===============================
  // 🔥 CARREGAR (REMOVE HERO)
  // ===============================
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("*")
        .eq("pagina_slug", "editais")
        .neq("bloco", "hero")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) console.error(error);

      const seen = new Set<string>();
      const deduped: Bloco[] = [];
      for (const row of data || []) {
        if (seen.has(row.bloco)) continue;
        seen.add(row.bloco);
        deduped.push(row as Bloco);
      }

      setDados(deduped);
      setLoading(false);
    }

    load();
  }, []);

  // ===============================
  // ATUALIZAR
  // ===============================
  function atualizar(index: number, campo: keyof Bloco, valor: string) {
    const copia = [...dados];
    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };
    setDados(copia);
  }

  // ===============================
  // 🔥 SALVAR (BLOQUEIA HERO)
  // ===============================
  async function salvar() {
    setSalvando(true);
    setMsg("Salvando...");

    try {
      for (const item of dados) {
        if (item.bloco === "hero") continue;

        const { error } = await upsertPaginaConteudo(supabase, {
          pagina_slug: item.pagina_slug || "editais",
          bloco: item.bloco,
          titulo: item.titulo,
          texto: item.texto,
        });

        if (error) {
          console.error(error);
          setMsg("Erro ao salvar");
          return;
        }
      }

      setMsg("Salvo com sucesso");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Textos — Editais</h1>

      <div className="admin-form">
        {dados.map((item, i) => (
          <div key={item.id || i} className="admin-card" style={{ marginBottom: 20 }}>
            <strong>{item.bloco}</strong>

            <label>Título</label>
            <input
              value={item.titulo || ""}
              onChange={(e) =>
                atualizar(i, "titulo", e.target.value)
              }
            />

            <label>Texto</label>
            <textarea
              rows={5}
              value={item.texto || ""}
              onChange={(e) =>
                atualizar(i, "texto", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      <button style={btnGreen} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}