"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminEditalDetalhePage() {
  const { id } = useParams();
  const router = useRouter();

  const [edital, setEdital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setEdital(data);
      setLoading(false);
    }

    if (id) load();
  }, [id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const { error } = await supabase
      .from("editais")
      .update({
        titulo: edital.titulo,
        tipo: edital.tipo,
        descricao: edital.descricao,
        periodo: edital.periodo, // 🔧 PADRÃO ÚNICO
        status: edital.status,
        resultado_organizacao:
          edital.status === "encerrado"
            ? edital.resultado_organizacao
            : null,
        resultado_cnpj:
          edital.status === "encerrado" ? edital.resultado_cnpj : null,
        resultado_valor:
          edital.status === "encerrado" ? edital.resultado_valor : null,
      })
      .eq("id", edital.id);

    if (error) {
      setMsg("Erro ao salvar alterações.");
    } else {
      setMsg("Alterações salvas com sucesso.");
    }

    setSaving(false);
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando edital…</p>;
  if (!edital) return <p style={{ padding: 24 }}>Edital não encontrado.</p>;

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editar Edital</h1>

      <p className="admin-subtitle">
        Este painel edita diretamente o conteúdo exibido ao público.
      </p>

      <form onSubmit={salvar} className="admin-card">
        <label>Título</label>
        <input
          value={edital.titulo || ""}
          onChange={(e) =>
            setEdital({ ...edital, titulo: e.target.value })
          }
        />

        <label>Tipo</label>
        <input
          value={edital.tipo || ""}
          onChange={(e) => setEdital({ ...edital, tipo: e.target.value })}
        />

        <label>Descrição / Objeto</label>
        <textarea
          rows={4}
          value={edital.descricao || ""}
          onChange={(e) =>
            setEdital({ ...edital, descricao: e.target.value })
          }
        />

        <label>Período</label>
        <input
          value={edital.periodo || ""}
          onChange={(e) =>
            setEdital({ ...edital, periodo: e.target.value })
          }
        />

        <label>Status</label>
        <select
          value={edital.status}
          onChange={(e) =>
            setEdital({ ...edital, status: e.target.value })
          }
        >
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
          <option value="em_breve">Em breve</option>
        </select>

        {edital.status === "encerrado" && (
          <>
            <h3 style={{ marginTop: 24 }}>Resultado do Edital</h3>

            <label>Organização selecionada</label>
            <input
              value={edital.resultado_organizacao || ""}
              onChange={(e) =>
                setEdital({
                  ...edital,
                  resultado_organizacao: e.target.value,
                })
              }
            />

            <label>CNPJ</label>
            <input
              value={edital.resultado_cnpj || ""}
              onChange={(e) =>
                setEdital({
                  ...edital,
                  resultado_cnpj: e.target.value,
                })
              }
            />

            <label>Valor aprovado</label>
            <input
              value={edital.resultado_valor || ""}
              onChange={(e) =>
                setEdital({
                  ...edital,
                  resultado_valor: e.target.value,
                })
              }
            />
          </>
        )}

        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button className="admin-button" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>

          <button
            type="button"
            className="admin-link"
            onClick={() => router.push("/admin/editais")}
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
}

