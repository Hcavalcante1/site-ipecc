"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EditarHeroPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("editais_secoes")
        .select("*")
        .eq("tipo", "hero")
        .single();

      if (error || !data) {
        alert("HERO não encontrado.");
        router.push("/admin/editais/textos");
        return;
      }

      setTitulo(data.titulo ?? "");
      setSubtitulo(data.subtitulo ?? "");
      setDescricao(data.descricao ?? "");
      setAtivo(data.ativo ?? true);
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function salvar() {
    try {
      setSalvando(true);

      await supabase
        .from("editais_secoes")
        .upsert({
          tipo: "hero",
          titulo,
          subtitulo,
          descricao,
          ativo,
          ordem: 1,
        });

      alert("HERO salvo com sucesso.");
      router.push("/admin/editais/textos");
    } catch {
      alert("Erro ao salvar HERO.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="admin-box">
        <h1 className="admin-h1">Editar HERO</h1>
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editar HERO</h1>

      <div className="admin-form" style={{ marginTop: 24 }}>
        <label>Título</label>
        <input
          className="admin-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Subtítulo</label>
        <input
          className="admin-input"
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
        />

        <label>Descrição</label>
        <textarea
          className="admin-textarea"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <button
          type="button"
          className="admin-button-small"
          onClick={() => setAtivo(!ativo)}
        >
          {ativo ? "Ativo" : "Inativo"}
        </button>
      </div>

      <div className="admin-save-row">
        <button
          className="admin-save-button"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
