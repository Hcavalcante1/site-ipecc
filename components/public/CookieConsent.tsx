"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";

const STORAGE_KEY = "ipecc_cookie_consent";
const VERSAO = "1.0";

export default function CookieConsent() {
  const [visivel, setVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Pequeno delay para não competir com o render inicial
      const t = setTimeout(() => setVisivel(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  async function registrar(analytics: boolean, marketing: boolean) {
    setSalvando(true);
    const payload = {
      aceito_essencial: true,
      aceito_analytics: analytics,
      aceito_marketing: marketing,
      versao_politica: VERSAO,
      user_agent: navigator.userAgent.slice(0, 255),
    };
    await supabase.from("lgpd_consentimentos").insert(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics, marketing, versao: VERSAO, em: new Date().toISOString() }));
    setVisivel(false);
    setSalvando(false);
  }

  if (!visivel) return null;

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Preferências de cookies">
      <div style={s.banner}>
        <div style={s.texto}>
          <strong style={s.titulo}>Cookies e Privacidade</strong>
          <p style={s.desc}>
            Usamos cookies essenciais para o funcionamento do site. Com sua permissão, também coletamos dados de análise
            para melhorar sua experiência. Consulte nossa{" "}
            <Link href="/politica-privacidade" style={s.link}>
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div style={s.botoes}>
          <button
            style={{ ...s.btn, ...s.btnSecundario }}
            onClick={() => registrar(false, false)}
            disabled={salvando}
          >
            Apenas essenciais
          </button>
          <button
            style={{ ...s.btn, ...s.btnPrimario }}
            onClick={() => registrar(true, false)}
            disabled={salvando}
          >
            Aceitar tudo
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: "0 16px 16px",
    pointerEvents: "none",
  },
  banner: {
    maxWidth: 780,
    margin: "0 auto",
    background: "#0f172a",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 16,
    padding: "18px 22px",
    display: "flex",
    gap: 20,
    alignItems: "center",
    flexWrap: "wrap" as const,
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    pointerEvents: "auto",
  },
  texto: { flex: 1, minWidth: 200 },
  titulo: { display: "block", fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 },
  desc: { margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
  link: { color: "#38bdf8", textDecoration: "underline" },
  botoes: { display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" as const },
  btn: { padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", whiteSpace: "nowrap" as const },
  btnSecundario: { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" },
  btnPrimario: { background: "#1d4ed8", color: "#fff" },
};
