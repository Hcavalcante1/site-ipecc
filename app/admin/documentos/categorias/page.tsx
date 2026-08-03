"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdCategory } from "@/lib/documentos/types";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

export default function CategoriasPage() {
  const [categories, setCategories] = useState<GdCategory[]>([]);
  const [name, setName] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/categorias", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setCategories(json.categories || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar categorias.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar() {
    const res = await fetch("/api/admin/documentos/categorias", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar categoria.");
      return;
    }
    setName("");
    carregar();
  }

  async function remover(id: string) {
    const ok = await confirmAction("Mover categoria para a lixeira?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Mover categoria para a lixeira?")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch(`/api/admin/documentos/categorias?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover.");
      return;
    }
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Categorias"
      description="Classifique documentos por categoria."
    >
      <div style={gdCardStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ ...gdInputStyle, maxWidth: 320 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria"
          />
          <button
            type="button"
            style={gdBtnStyle}
            disabled={!name.trim()}
            onClick={criar}
          >
            Criar categoria
          </button>
        </div>
      </div>

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : categories.length === 0 ? (
        <div style={gdCardStyle}>Nenhuma categoria cadastrada.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {categories.map((c) => (
            <div
              key={c.id}
              style={{
                ...gdCardStyle,
                marginTop: 0,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <strong>{c.name}</strong>
                {c.slug ? (
                  <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
                    {c.slug}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#ef4444" }}
                onClick={() => remover(c.id)}
              >
                Lixeira
              </button>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
