"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
      <p className="admin-subtitle">Gerencie os eventos do site.</p>

      <div style={{ marginTop: 16 }}>
        <a href="/admin/eventos/form">
          <button className="admin-button">+ Novo evento</button>
        </a>
      </div>

      {loading ? (
        <p style={{ marginTop: 20 }}>Carregando...</p>
      ) : (
        <div className="admin-grid" style={{ marginTop: 20 }}>
          {eventos.map((e) => (
            <div key={e.id} className="admin-card">
              <h3>{e.titulo}</h3>

              <p style={{ fontSize: 13, opacity: 0.8 }}>
                {e.descricao}
              </p>

              <p style={{ fontSize: 12, marginTop: 6 }}>
                📅{" "}
                {e.data_evento
                  ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                  : "Sem data"}
              </p>

              {e.horario && (
                <p style={{ fontSize: 12 }}>
                  ⏰ {e.horario}
                </p>
              )}

              <p style={{ fontSize: 12 }}>
                📍 {e.local || "Sem local"}
              </p>

              {e.whatsapp && (
                <p style={{ fontSize: 12 }}>
                  💬 {e.whatsapp}
                </p>
              )}

              <p style={{ fontSize: 12, marginTop: 6 }}>
                {e.publicado ? "🟢 Publicado" : "🔴 Rascunho"}
              </p>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <a href={`/admin/eventos/form?id=${e.id}`}>
                  <button className="admin-button">Editar</button>
                </a>

                <button
                  onClick={() => excluir(e.id)}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
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