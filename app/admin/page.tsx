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
    return <div style={{ padding: 24 }}>Carregando...</div>;
  }

  return (
    <div style={styles.wrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel Administrativo</h1>
          <p style={styles.subtitle}>Usuário: {userEmail}</p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.refreshBtn}
            onClick={() => window.location.reload()}
          >
            Atualizar
          </button>

          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>

      {/* BLOCO PRINCIPAL */}
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Resumo do Sistema</h2>

        {/* DASHBOARD ORIGINAL */}
        <AdminDashboardClient userEmail={userEmail} />
      </div>
    </div>
  );
}

/* ===== ESTILO ===== */

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    width: "100%",
    padding: 24,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#e5e7eb",
  },

  subtitle: {
    color: "#94a3b8",
  },

  actions: {
    display: "flex",
    gap: 10,
  },

  refreshBtn: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "1px solid #334155",
    background: "transparent",
    color: "#e5e7eb",
    cursor: "pointer",
  },

  logoutBtn: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },

  hero: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 24,
  },

  heroTitle: {
    marginBottom: 16,
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: 600,
  },
};
