"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { adminTokens } from "@/components/admin";

const wrapTopStyle: CSSProperties = {
  marginTop: adminTokens.spacing.sm * 2,
};

const sectionTopStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base + adminTokens.spacing.sm,
};

const descricaoStyle: CSSProperties = {
  fontSize: adminTokens.typography.fontSize.xs,
  opacity: 0.8,
};

const metaLinhaStyle: CSSProperties = {
  fontSize: adminTokens.typography.fontSize.xs,
};

const metaLinhaComTopStyle: CSSProperties = {
  ...metaLinhaStyle,
  marginTop: adminTokens.spacing.xs,
};

const statusLinhaStyle: CSSProperties = {
  ...metaLinhaStyle,
  marginTop: adminTokens.spacing.xs,
};

const acoesRowStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base,
  display: "flex",
  gap: adminTokens.spacing.sm,
};

const excluirBtnStyle: CSSProperties = {
  background: adminTokens.colors.error.background,
  color: adminTokens.colors.error.text,
  border: "none",
  borderRadius: adminTokens.borderRadius.full,
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  cursor: "pointer",
  fontWeight: 600,
};

type Evento = {
  id: string;
  titulo: string;
  descricao: string;
  data_evento: string;
  local: string;
  horario?: string;
  whatsapp?: string;
  publicado: boolean;
};

export default function EventosAdmin() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarEventos() {
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("data_evento", { ascending: true });

    if (data) setEventos(data);
    setLoading(false);
  }

  async function excluir(id: string) {
    const confirmar = confirm("Deseja excluir este evento?");
    if (!confirmar) return;

    await supabase.from("eventos").delete().eq("id", id);
    carregarEventos();
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  return (
    <>
      <h1 className="admin-h1">Eventos</h1>
      <p className="admin-subtitle">
        Gerencie os eventos exibidos em /eventos e nos blocos públicos relacionados.
        Use esta tela para publicar agenda, local, horário e canal de contato do evento.
      </p>

      <div style={wrapTopStyle}>
        <a href="/admin/eventos/form">
          <button className="admin-button">+ Novo evento</button>
        </a>
      </div>

      {loading ? (
        <p style={sectionTopStyle}>Carregando...</p>
      ) : (
        <div className="admin-grid" style={sectionTopStyle}>
          {eventos.map((e) => (
            <div key={e.id} className="admin-card">
              <h3>{e.titulo}</h3>

              <p style={descricaoStyle}>
                {e.descricao}
              </p>

              <p style={metaLinhaComTopStyle}>
                📅{" "}
                {e.data_evento
                  ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                  : "Sem data"}
              </p>

              {e.horario && (
                <p style={metaLinhaStyle}>
                  ⏰ {e.horario}
                </p>
              )}

              <p style={metaLinhaStyle}>
                📍 {e.local || "Sem local"}
              </p>

              {e.whatsapp && (
                <p style={metaLinhaStyle}>
                  💬 {e.whatsapp}
                </p>
              )}

              <p style={statusLinhaStyle}>
                {e.publicado ? "🟢 Publicado" : "🔴 Rascunho"}
              </p>

              <div style={acoesRowStyle}>
                <a href={`/admin/eventos/form?id=${e.id}`}>
                  <button className="admin-button">Editar</button>
                </a>

                <button
                  onClick={() => excluir(e.id)}
                  style={excluirBtnStyle}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
