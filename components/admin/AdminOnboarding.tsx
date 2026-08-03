"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "ipecc_onboarding_v1";

type Passo = {
  id: string;
  titulo: string;
  desc: string;
  href: string;
  cta: string;
};

const PASSOS: Passo[] = [
  {
    id: "org",
    titulo: "Configure sua organização",
    desc: "Adicione nome, CNPJ, e-mail de contato e logo.",
    href: "/admin/organizacao",
    cta: "Configurar",
  },
  {
    id: "edital",
    titulo: "Crie seu primeiro edital",
    desc: "Publique um chamamento ou edital de parceria.",
    href: "/admin/editais",
    cta: "Criar edital",
  },
  {
    id: "transparencia",
    titulo: "Publique transparência",
    desc: "Adicione convênios ou prestação de contas.",
    href: "/admin/paginas/transparencia",
    cta: "Adicionar",
  },
  {
    id: "portal",
    titulo: "Crie um link de parceiro",
    desc: "Gere um portal privado para um financiador.",
    href: "/admin/portal",
    cta: "Gerar link",
  },
  {
    id: "lgpd",
    titulo: "Revise a política de privacidade",
    desc: "Personalize o texto da Política de Privacidade.",
    href: "/admin/lgpd",
    cta: "Revisar",
  },
];

export default function AdminOnboarding() {
  const [visivel, setVisivel] = useState(false);
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const estado = JSON.parse(raw) as { dispensado?: boolean; concluidos?: string[] };
        if (estado.dispensado) return;
        if (estado.concluidos) setConcluidos(new Set(estado.concluidos));
      }
      setVisivel(true);
    } catch {
      setVisivel(true);
    }
  }, []);

  function salvar(next: Set<string>, dispensado = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dispensado,
      concluidos: [...next],
    }));
  }

  function marcarFeito(id: string) {
    setConcluidos((prev) => {
      const next = new Set(prev);
      next.add(id);
      salvar(next);
      return next;
    });
  }

  function dispensar() {
    salvar(concluidos, true);
    setVisivel(false);
  }

  if (!visivel) return null;

  const total = PASSOS.length;
  const feitos = concluidos.size;
  const pct = Math.round((feitos / total) * 100);
  const tudo = feitos >= total;

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div style={s.headerLeft}>
          <strong style={s.titulo}>
            {tudo ? "✓ Setup completo!" : "Primeiros passos"}
          </strong>
          <span style={s.progTexto}>{feitos}/{total} concluídos</span>
        </div>
        <div style={s.headerRight}>
          <button style={s.btnMin} onClick={() => setMinimizado((m) => !m)}>
            {minimizado ? "Expandir" : "Minimizar"}
          </button>
          <button style={s.btnDispensar} onClick={dispensar}>
            Dispensar
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={s.progBar}>
        <div style={{ ...s.progFill, width: `${pct}%` }} />
      </div>

      {!minimizado && (
        <div style={s.passos}>
          {PASSOS.map((passo) => {
            const feito = concluidos.has(passo.id);
            return (
              <div key={passo.id} style={{ ...s.passo, ...(feito ? s.passoFeito : {}) }}>
                <button
                  style={{ ...s.check, ...(feito ? s.checkFeito : {}) }}
                  onClick={() => marcarFeito(passo.id)}
                  title={feito ? "Concluído" : "Marcar como feito"}
                >
                  {feito ? "✓" : ""}
                </button>
                <div style={s.passoInfo}>
                  <strong style={{ ...s.passoTitulo, ...(feito ? s.passoTituloFeito : {}) }}>
                    {passo.titulo}
                  </strong>
                  <span style={s.passoDesc}>{passo.desc}</span>
                </div>
                {!feito && (
                  <Link href={passo.href} style={s.passoCta} onClick={() => marcarFeito(passo.id)}>
                    {passo.cta} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tudo && !minimizado && (
        <div style={s.conclusao}>
          <p style={s.conclusaoTexto}>
            Plataforma configurada. Você pode acessar todos os módulos pelo menu lateral.
          </p>
          <button style={s.btnConcluir} onClick={dispensar}>
            Concluir setup
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(29,78,216,0.4)",
    borderRadius: 16,
    padding: "18px 22px",
    marginBottom: 24,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  headerRight: { display: "flex", gap: 8 },
  titulo: { fontSize: 15, fontWeight: 800, color: "#e0f2fe" },
  progTexto: { fontSize: 12, color: "#64748b" },
  btnMin: { padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  btnDispensar: { padding: "4px 10px", borderRadius: 7, border: "none", background: "transparent", color: "#475569", fontSize: 11, cursor: "pointer" },
  progBar: { height: 4, background: "rgba(148,163,184,0.15)", borderRadius: 999, marginBottom: 16, overflow: "hidden" },
  progFill: { height: "100%", background: "linear-gradient(90deg, #1d4ed8, #38bdf8)", borderRadius: 999, transition: "width 0.4s ease" },
  passos: { display: "flex", flexDirection: "column", gap: 8 },
  passo: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.1)" },
  passoFeito: { opacity: 0.5 },
  check: { width: 22, height: 22, borderRadius: 6, border: "2px solid rgba(148,163,184,0.4)", background: "transparent", color: "transparent", fontSize: 13, fontWeight: 900, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  checkFeito: { background: "#1d4ed8", borderColor: "#1d4ed8", color: "#fff" },
  passoInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  passoTitulo: { fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  passoTituloFeito: { textDecoration: "line-through", color: "#64748b" },
  passoDesc: { fontSize: 11, color: "#64748b" },
  passoCta: { padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(29,78,216,0.5)", background: "rgba(29,78,216,0.15)", color: "#93c5fd", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 },
  conclusao: { marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  conclusaoTexto: { margin: 0, fontSize: 13, color: "#64748b" },
  btnConcluir: { padding: "8px 18px", borderRadius: 10, border: "none", background: "#166534", color: "#86efac", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
