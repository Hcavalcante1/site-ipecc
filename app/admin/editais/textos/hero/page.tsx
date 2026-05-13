"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        .eq("slug", "hero")
        .single();

      if (error || !data) {
        alert("HERO não encontrado. Crie o bloco HERO primeiro.");
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

      const { error } = await supabase
        .from("editais_secoes")
        .update({
          titulo,
          subtitulo,
          descricao,
          ativo,
          tipo: "hero",
          ordem: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", "hero");

      if (error) {
        throw error;
      }

      alert("HERO salvo com sucesso.");
      router.push("/admin/editais/textos");
    } catch (e) {
      console.error("Erro ao salvar HERO:", e);
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

      <p className="admin-subtitle">
        Ajuste o conteúdo principal da página pública{" "}
        <strong>/editais</strong>.
      </p>

      <div className="admin-form" style={{ marginTop: 24 }}>
        <div>
          <label>Título do HERO</label>
          <input
            className="admin-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div>
          <label>Subtítulo do HERO</label>
          <input
            className="admin-input"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
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
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

