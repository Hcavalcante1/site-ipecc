"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NovaSecaoEditalPage() {
  const router = useRouter();

  const [salvando, setSalvando] = useState(false);

  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  async function salvar() {
    if (!slug) {
      alert("Informe um identificador (slug).");
      return;
    }

    try {
      setSalvando(true);

      const { data: ultima } = await supabase
        .from("editais_secoes")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1)
        .single();

      const ordem = (ultima?.ordem ?? 0) + 1;

      const { error } = await supabase.from("editais_secoes").insert({
        slug,
        tipo: "texto",
        titulo,
        descricao,
        ativo,
        ordem,
      });

      if (error) throw error;

      alert("Nova seção criada com sucesso.");
      router.push("/admin/editais/textos");
    } catch (e) {
      console.error("Erro ao criar seção:", e);
      alert("Erro ao criar seção.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Nova seção de texto</h1>

      <p className="admin-subtitle">
        Crie um novo bloco de texto para a página pública de editais.
      </p>

      <div className="admin-form" style={{ marginTop: 24 }}>
        <div>
          <label>Identificador (slug)</label>
          <input
            className="admin-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: metodologia, resultados, cronograma"
          />
        </div>

        <div>
          <label>Título</label>
          <input
            className="admin-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div>
          <label>Descrição</label>
          <textarea
            className="admin-textarea"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label>Status</label>
          <button
            type="button"
            className="admin-button-small"
            onClick={() => setAtivo(!ativo)}
          >
            {ativo ? "Ativo" : "Inativo"}
          </button>
        </div>
      </div>

      <div className="admin-save-row">
        <button
          type="button"
          className="admin-save-button"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Criar seção"}
        </button>
      </div>
    </div>
  );
}
