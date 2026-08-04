"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";

/* ============================
   TIPOS
============================ */
type Mensagem = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  mensagem: string;
  created_at: string;
};

/* ============================
   ESTILOS BASE
============================ */
const card = {
  background: "linear-gradient(180deg,#0b1220,#020617)",
  borderRadius: 20,
  border: "1px solid #1e293b",
};

const btnDanger = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "10px 24px",
  fontWeight: 600,
  cursor: "pointer",
};

/* ============================
   PAGE
============================ */
export default function ContatoMensagensAdminPage() {
  const [loading, setLoading] = useState(true);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [selecionada, setSelecionada] = useState<Mensagem | null>(null);

  /* ============================
     LOAD
  ============================ */
  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("contato_mensagens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar mensagens:", error);
      setLoading(false);
      return;
    }

    setMensagens(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* ============================
     DELETE
  ============================ */
  async function apagar(id: string) {
    const ok = await confirmAction("Deseja realmente apagar esta mensagem?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Deseja realmente apagar esta mensagem?")) return;
      else if (isConfirmModalReady()) return;
    }

    const { error } = await supabase
      .from("contato_mensagens")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao apagar:", error);
      return;
    }

    setSelecionada(null);
    load();
  }

  if (loading) return <p>Carregando mensagens…</p>;

  return (
    <div style={{ padding: 32 }}>
      {/* ================= HEADER ================= */}
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
        Mensagens recebidas
      </h1>
      <p style={{ opacity: 0.65, marginBottom: 32 }}>
        Formulário de contato do site
      </p>

      {/* ================= LAYOUT ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 32,
          alignItems: "stretch",
        }}
      >
        {/* ================= INBOX ================= */}
        <aside
          style={{
            ...card,
            padding: 20,
            maxHeight: "72vh",
            overflowY: "auto",
          }}
        >
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>
            Caixa de entrada
          </h3>

          {mensagens.length === 0 && (
            <p style={{ opacity: 0.5, textAlign: "center", marginTop: 40 }}>
              Nenhuma mensagem recebida até o momento.
            </p>
          )}

          {mensagens.map((m) => {
            const ativa = selecionada?.id === m.id;

            return (
              <div
                key={m.id}
                onClick={() => setSelecionada(m)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  marginBottom: 10,
                  cursor: "pointer",
                  background: ativa
                    ? "linear-gradient(90deg,#1d4ed8,#020617)"
                    : "#020617",
                  border: ativa
                    ? "1px solid #3b82f6"
                    : "1px solid #1e293b",
                  boxShadow: ativa
                    ? "0 0 0 1px #3b82f6, 0 10px 30px rgba(59,130,246,.25)"
                    : "none",
                  transition: "all .15s ease",
                }}
              >
                <div style={{ fontWeight: 600 }}>{m.nome}</div>

                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {m.email}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.85,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {m.mensagem}
                </div>

                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            );
          })}
        </aside>

        {/* ================= LEITURA ================= */}
        <section
          style={{
            ...card,
            padding: 28,
            minHeight: 300,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!selecionada && (
            <p style={{ opacity: 0.6 }}>
              Nenhuma mensagem selecionada.
              <br />
              Escolha um item na caixa de entrada para visualizar.
            </p>
          )}

          {selecionada && (
            <>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, marginBottom: 4 }}>
                  {selecionada.nome}
                </h2>

                <div style={{ opacity: 0.7 }}>
                  {selecionada.email}
                </div>

                {selecionada.telefone && (
                  <div style={{ opacity: 0.7 }}>
                    {selecionada.telefone}
                  </div>
                )}

                <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24 }}>
                  {new Date(selecionada.created_at).toLocaleString("pt-BR")}
                </div>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.75,
                    fontSize: 15,
                    maxWidth: 680,
                  }}
                >
                  {selecionada.mensagem}
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button
                  style={btnDanger}
                  onClick={() => apagar(selecionada.id)}
                >
                  Apagar mensagem
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}