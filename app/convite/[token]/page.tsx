"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ConviteInfo = {
  email: string;
  papel: string;
  expires_at: string;
  aceito_em: string | null;
  org_nome: string;
};

type Estado = "carregando" | "valido" | "aceito" | "expirado" | "invalido" | "aceitando" | "concluido" | "sem_login";

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>("carregando");
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function checar() {
      const { data: rows } = await supabase
        .rpc("validar_convite_token", { p_token: token });

      const data = rows?.[0];

      if (!data) { setEstado("invalido"); return; }
      if (data.aceito_em) { setEstado("aceito"); return; }
      if (new Date(data.expires_at) < new Date()) { setEstado("expirado"); return; }

      setConvite({
        email:      data.email,
        papel:      data.papel,
        expires_at: data.expires_at,
        aceito_em:  data.aceito_em,
        org_nome:   data.org_nome ?? "—",
      });

      const { data: { user } } = await supabase.auth.getUser();
      setEstado(user ? "valido" : "sem_login");
    }
    void checar();
  }, [token]);

  async function aceitar() {
    setEstado("aceitando");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setEstado("sem_login"); return; }

    const res = await fetch("/api/convite/aceitar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    });

    const json = (await res.json()) as { ok: boolean; error?: string };
    if (json.ok) {
      setEstado("concluido");
      setTimeout(() => router.replace("/admin"), 2000);
    } else {
      const msgs: Record<string, string> = {
        email_nao_corresponde: "O convite foi enviado para outro endereço de e-mail.",
        convite_ja_aceito:     "Este convite já foi aceito.",
        convite_expirado:      "Este convite expirou.",
      };
      setErro(msgs[json.error ?? ""] ?? `Erro: ${json.error ?? "desconhecido"}`);
      setEstado("valido");
    }
  }

  function irParaLogin() {
    router.push(`/login?redirect=/convite/${token}`);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <img src="/media/ipecc_logo_v2.png" alt="IPECC" style={{ height: 40, objectFit: "contain" }} />
        </div>

        {estado === "carregando" && (
          <p style={s.sub}>Verificando convite...</p>
        )}

        {estado === "invalido" && (
          <>
            <h1 style={s.titulo}>Convite inválido</h1>
            <p style={s.sub}>Este link de convite não existe ou já foi removido.</p>
          </>
        )}

        {estado === "expirado" && (
          <>
            <h1 style={s.titulo}>Convite expirado</h1>
            <p style={s.sub}>Este convite expirou. Solicite um novo convite ao administrador da organização.</p>
          </>
        )}

        {estado === "aceito" && (
          <>
            <h1 style={s.titulo}>Convite já aceito</h1>
            <p style={s.sub}>Este convite já foi utilizado. Acesse o painel administrativo normalmente.</p>
            <button style={s.btn} onClick={() => router.push("/admin")}>Ir para o painel</button>
          </>
        )}

        {estado === "sem_login" && convite && (
          <>
            <h1 style={s.titulo}>Convite para colaborar</h1>
            <div style={s.infoBox}>
              <p style={s.infoRow}><span style={s.infoLabel}>Organização</span><strong>{convite.org_nome}</strong></p>
              <p style={s.infoRow}><span style={s.infoLabel}>Papel</span><strong>{convite.papel}</strong></p>
              <p style={s.infoRow}><span style={s.infoLabel}>Enviado para</span><strong>{convite.email}</strong></p>
            </div>
            <p style={s.sub}>Faça login com a conta <strong>{convite.email}</strong> para aceitar este convite.</p>
            <button style={s.btn} onClick={irParaLogin}>Entrar para aceitar →</button>
          </>
        )}

        {(estado === "valido" || estado === "aceitando") && convite && (
          <>
            <h1 style={s.titulo}>Convite para colaborar</h1>
            <div style={s.infoBox}>
              <p style={s.infoRow}><span style={s.infoLabel}>Organização</span><strong>{convite.org_nome}</strong></p>
              <p style={s.infoRow}><span style={s.infoLabel}>Papel</span><strong>{convite.papel}</strong></p>
              <p style={s.infoRow}><span style={s.infoLabel}>Enviado para</span><strong>{convite.email}</strong></p>
              <p style={s.infoRow}>
                <span style={s.infoLabel}>Expira em</span>
                <strong>{new Date(convite.expires_at).toLocaleDateString("pt-BR")}</strong>
              </p>
            </div>
            {erro && <p style={s.erro}>{erro}</p>}
            <button
              style={{ ...s.btn, opacity: estado === "aceitando" ? 0.7 : 1 }}
              onClick={aceitar}
              disabled={estado === "aceitando"}
            >
              {estado === "aceitando" ? "Aceitando..." : "Aceitar convite →"}
            </button>
          </>
        )}

        {estado === "concluido" && (
          <>
            <h1 style={{ ...s.titulo, color: "#86efac" }}>Convite aceito!</h1>
            <p style={s.sub}>Você agora faz parte da organização. Redirecionando para o painel...</p>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" },
  card: { background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: "40px 36px", maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  logo: { textAlign: "center" as const, marginBottom: 28 },
  titulo: { margin: "0 0 12px", fontSize: 22, fontWeight: 900, color: "#f1f5f9", textAlign: "center" as const },
  sub: { color: "#94a3b8", fontSize: 14, textAlign: "center" as const, lineHeight: 1.6, margin: "0 0 20px" },
  infoBox: { background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0", fontSize: 14, color: "#cbd5e1" },
  infoLabel: { color: "#64748b", fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  btn: { display: "block", width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 },
  erro: { color: "#fca5a5", fontSize: 13, textAlign: "center" as const, margin: "0 0 12px", background: "rgba(127,29,29,0.2)", padding: "8px 12px", borderRadius: 8, border: "1px solid #7f1d1d" },
};
