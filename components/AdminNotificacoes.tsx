"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

const LS_KEY = "ipecc_admin_notif_v1";
const MAX_NOTIF = 30;

type TipoNotif = "proposta" | "convite" | "assinatura" | "edital" | "sistema";

type Notificacao = {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  descricao: string;
  href: string;
  lida: boolean;
  criadaEm: string;
};

const TIPO_ICONE: Record<TipoNotif, string> = {
  proposta:   "📥",
  convite:    "🤝",
  assinatura: "💳",
  edital:     "📋",
  sistema:    "🔔",
};

const TIPO_COR: Record<TipoNotif, string> = {
  proposta:   "#a78bfa",
  convite:    "#86efac",
  assinatura: "#93c5fd",
  edital:     "#fde047",
  sistema:    "#94a3b8",
};

function carregarDoStorage(): Notificacao[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Notificacao[]) : [];
  } catch {
    return [];
  }
}

function salvarNoStorage(lista: Notificacao[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lista.slice(0, MAX_NOTIF)));
  } catch { /* sem-op */ }
}

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const adicionarNotif = useCallback((n: Omit<Notificacao, "id" | "lida" | "criadaEm">) => {
    setNotificacoes((prev) => {
      const nova: Notificacao = { ...n, id: gerarId(), lida: false, criadaEm: new Date().toISOString() };
      const atualizado = [nova, ...prev].slice(0, MAX_NOTIF);
      salvarNoStorage(atualizado);
      return atualizado;
    });
  }, []);

  // Carregar histórico recente do Supabase no mount
  useEffect(() => {
    const salvas = carregarDoStorage();
    if (salvas.length > 0) {
      setNotificacoes(salvas);
      return;
    }

    async function carregarRecentes() {
      const [propostasRes, convitesRes] = await Promise.all([
        supabase
          .from("propostas")
          .select("id, nome_proponente, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("convites_org")
          .select("id, email, papel, aceito_em")
          .not("aceito_em", "is", null)
          .order("aceito_em", { ascending: false })
          .limit(3),
      ]);

      const lista: Notificacao[] = [];

      for (const p of propostasRes.data ?? []) {
        lista.push({
          id: `proposta-${p.id}`,
          tipo: "proposta",
          titulo: "Nova proposta recebida",
          descricao: (p.nome_proponente as string | null) ?? "Proponente não identificado",
          href: "/admin/propostas",
          lida: true,
          criadaEm: p.created_at as string,
        });
      }
      for (const c of convitesRes.data ?? []) {
        lista.push({
          id: `convite-${c.id}`,
          tipo: "convite",
          titulo: "Convite aceito",
          descricao: `${c.email as string} entrou como ${c.papel as string}`,
          href: "/admin/acessos",
          lida: true,
          criadaEm: c.aceito_em as string,
        });
      }

      lista.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
      if (lista.length > 0) {
        setNotificacoes(lista);
        salvarNoStorage(lista);
      }
    }

    void carregarRecentes();
  }, []);

  // Supabase Realtime
  useEffect(() => {
    const canal = supabase
      .channel("admin_notif_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "propostas" },
        (payload) => {
          const p = payload.new as { id: string; nome_proponente?: string };
          adicionarNotif({
            tipo: "proposta",
            titulo: "Nova proposta recebida!",
            descricao: p.nome_proponente ?? "Proponente não identificado",
            href: "/admin/propostas",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "convites_org" },
        (payload) => {
          const c = payload.new as { id: string; email?: string; papel?: string; aceito_em?: string };
          if (!c.aceito_em) return;
          adicionarNotif({
            tipo: "convite",
            titulo: "Convite aceito",
            descricao: `${c.email ?? "Usuário"} entrou como ${c.papel ?? "membro"}`,
            href: "/admin/acessos",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "assinaturas" },
        (payload) => {
          const a = payload.new as { status?: string; plano?: string };
          adicionarNotif({
            tipo: "assinatura",
            titulo: "Assinatura atualizada",
            descricao: `Status: ${a.status ?? "—"} · Plano: ${a.plano ?? "—"}`,
            href: "/admin/faturamento",
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(canal); };
  }, [adicionarNotif]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function marcarTodasLidas() {
    setNotificacoes((prev) => {
      const atualizado = prev.map((n) => ({ ...n, lida: true }));
      salvarNoStorage(atualizado);
      return atualizado;
    });
  }

  function limpar() {
    setNotificacoes([]);
    localStorage.removeItem(LS_KEY);
  }

  function marcarLida(id: string) {
    setNotificacoes((prev) => {
      const atualizado = prev.map((n) => n.id === id ? { ...n, lida: true } : n);
      salvarNoStorage(atualizado);
      return atualizado;
    });
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setAberto((v) => !v); if (!aberto) marcarTodasLidas(); }}
        style={s.bell}
        title="Notificações"
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lida(s)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {naoLidas > 0 && (
          <span style={s.badge}>{naoLidas > 9 ? "9+" : naoLidas}</span>
        )}
      </button>

      {aberto && (
        <div style={s.dropdown}>
          <div style={s.dropHeader}>
            <span style={s.dropTitulo}>Notificações</span>
            <div style={{ display: "flex", gap: 8 }}>
              {notificacoes.length > 0 && (
                <button type="button" style={s.dropAcao} onClick={limpar}>
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div style={s.lista}>
            {notificacoes.length === 0 ? (
              <div style={s.vazio}>Nenhuma notificação.</div>
            ) : (
              notificacoes.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  style={{ ...s.item, ...(n.lida ? s.itemLida : s.itemNaoLida) }}
                  onClick={() => { marcarLida(n.id); setAberto(false); }}
                >
                  <div style={{ ...s.itemIcone, color: TIPO_COR[n.tipo] }}>
                    {TIPO_ICONE[n.tipo]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemTitulo}>{n.titulo}</div>
                    <div style={s.itemDesc}>{n.descricao}</div>
                    <div style={s.itemTempo}>{tempo(n.criadaEm)}</div>
                  </div>
                  {!n.lida && <div style={s.ponto} />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function tempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const s: Record<string, React.CSSProperties> = {
  bell:       { position: "relative", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" },
  badge:      { position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 },
  dropdown:   { position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: 320, background: "#0f172a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", zIndex: 9999, overflow: "hidden" },
  dropHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(148,163,184,0.1)" },
  dropTitulo: { fontSize: 13, fontWeight: 800, color: "#f1f5f9" },
  dropAcao:   { background: "transparent", border: "none", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "2px 6px", borderRadius: 6 },
  lista:      { maxHeight: 360, overflowY: "auto" as const },
  vazio:      { padding: "24px 16px", textAlign: "center" as const, color: "#475569", fontSize: 13 },
  item:       { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", textDecoration: "none", borderBottom: "1px solid rgba(148,163,184,0.07)", transition: "background 0.1s" },
  itemLida:   { background: "transparent" },
  itemNaoLida:{ background: "rgba(29,78,216,0.08)" },
  itemIcone:  { fontSize: 16, flexShrink: 0, marginTop: 1 },
  itemTitulo: { fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 },
  itemDesc:   { fontSize: 11, color: "#64748b", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  itemTempo:  { fontSize: 10, color: "#334155", marginTop: 3 },
  ponto:      { width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: 4 },
};
