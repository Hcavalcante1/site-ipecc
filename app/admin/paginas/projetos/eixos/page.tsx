"use client";

import { useState, useEffect } from "react";
import { AdminSalvarButton } from "@/components/admin";
import { supabase } from "@/lib/supabaseClient";

type Eixo = {
  id?: string;
  titulo: string;
  texto: string;
  imagem_url?: string;
  ordem: number;
};

export default function ProjetosEixosAdminPage() {
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const sInput: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,.8)",
    background: "rgba(15,23,42,.85)",
    color: "#e6edf3",
    fontSize: ".9rem",
  };

  const sTextarea: React.CSSProperties = {
    ...sInput,
    minHeight: 100,
    resize: "vertical",
  };

  // 🔹 LOAD (AGORA CORRETO)
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("paginas_eixos") // ✅ TABELA CORRETA
      .select("*")
      .eq("pagina_slug", "projetos")
      .eq("bloco", "eixos")
      .order("ordem");

    if (data) {
      setEixos(data);
    }
  }

  function updateEixo<K extends keyof Eixo>(id: string | undefined, campo: K, valor: Eixo[K]) {
    setEixos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  function addEixo() {
    setEixos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        titulo: "Novo eixo",
        texto: "Descrição do eixo",
        imagem_url: "/media/shared/fallbacks/eixo-default.jpg",
        ordem: prev.length + 1,
      },
    ]);
  }

  function removeEixo(id?: string) {
    setEixos((prev) => prev.filter((e) => e.id !== id));
  }

  // 🔥 SALVAR CORRETO
  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);

    try {
      const deleted = await supabase
        .from("paginas_eixos")
        .delete()
        .eq("pagina_slug", "projetos")
        .eq("bloco", "eixos");

      if (deleted.error) throw deleted.error;

      const novos = eixos.map((eixo, index) => ({
        titulo: eixo.titulo,
        texto: eixo.texto,
        imagem_url: eixo.imagem_url || "/media/shared/fallbacks/eixo-default.jpg",
        ordem: index + 1,
        pagina_slug: "projetos",
        bloco: "eixos",
      }));

      const inserted = await supabase.from("paginas_eixos").insert(novos);
      if (inserted.error) throw inserted.error;

      setMsg("Salvo com sucesso.");
      await load();
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Eixos</h1>
        <p className="admin-subtitle">
          Edite os eixos exatamente como aparecem na página pública.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Eixos:</span>

          <button
            type="button"
            onClick={addEixo}
            className="admin-button"
          >
            + Adicionar
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {eixos.map((eixo) => (
            <div
              key={eixo.id}
              style={{
                background: "rgba(15,23,42,.9)",
                borderRadius: 12,
                padding: 14,
                border: "1px solid rgba(148,163,184,.5)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => removeEixo(eixo.id)}
                style={{
                  marginLeft: "auto",
                  background: "red",
                  color: "#fff",
                  padding: "3px 10px",
                }}
              >
                Remover
              </button>

              <input
                value={eixo.titulo}
                onChange={(e) =>
                  updateEixo(eixo.id, "titulo", e.target.value)
                }
                style={sInput}
              />

              <textarea
                value={eixo.texto}
                onChange={(e) =>
                  updateEixo(eixo.id, "texto", e.target.value)
                }
                style={sTextarea}
              />

              <input
                value={eixo.imagem_url || ""}
                onChange={(e) =>
                  updateEixo(eixo.id, "imagem_url", e.target.value)
                }
                style={sInput}
                placeholder="/media/eixo.jpg"
              />
            </div>
          ))}
        </div>

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </form>
    </>
  );
}