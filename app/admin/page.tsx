"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState("...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      setUserEmail(user.email);
    }

    setLoading(false);
  }

  async function handleLogout() {
    sessionStorage.removeItem("ipecc_admin_active");
    localStorage.removeItem("ipecc_admin_closed");
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#e5e7eb" }}>Carregando...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>IPECC Admin</span>
          <h1 style={styles.title}>Painel Administrativo</h1>
          <p style={styles.subtitle}>
            Visao geral operacional, publicacoes, propostas e atividade recente.
          </p>
        </div>

        <div style={styles.actions}>
          <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
            Atualizar
          </button>

          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>

      <section style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <h2 style={styles.heroTitle}>Resumo do Sistema</h2>
            <p style={styles.heroText}>Usuario ativo: {userEmail}</p>
          </div>
          <div style={styles.statusPill}>Ambiente operacional</div>
        </div>

        <AdminDashboardClient userEmail={userEmail} />
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    width: "100%",
    padding: 18,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
    padding: "10px 4px 0",
  },

  eyebrow: {
    display: "inline-flex",
    marginBottom: 6,
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#e5e7eb",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    fontSize: 14,
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  refreshBtn: {
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid rgba(125, 211, 252, 0.45)",
    background: "rgba(14, 165, 233, 0.18)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 700,
  },

  logoutBtn: {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 80% 0%, rgba(34, 211, 238, 0.24), transparent 34%), linear-gradient(135deg, #0f2f86 0%, #071a52 42%, #020617 100%)",
    border: "1px solid rgba(147, 197, 253, 0.35)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 22px 60px rgba(2, 6, 23, 0.58)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 18,
  },

  heroTitle: {
    margin: 0,
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: 800,
  },

  heroText: {
    margin: "6px 0 0",
    color: "#bfdbfe",
    fontSize: 13,
  },

  statusPill: {
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(34, 197, 94, 0.18)",
    border: "1px solid rgba(74, 222, 128, 0.45)",
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
};
