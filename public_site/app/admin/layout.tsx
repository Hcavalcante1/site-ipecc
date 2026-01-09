"use client";

import "./globals.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkAuth();
  }, [router]);

  if (checking) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="admin-body">
      <div className="admin-wrapper">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <div className="admin-logo-icon">AP</div>
            <div className="admin-logo-text">
              <span className="admin-logo-title">APECC</span>
              <span className="admin-logo-sub">Painel Administrativo</span>
            </div>
          </div>

          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-item">🏠 Dashboard</Link>
            <Link href="/admin/paginas" className="admin-nav-item">📄 Páginas</Link>
            <Link href="/admin/editais" className="admin-nav-item">📑 Editais</Link>
            <Link href="/admin/propostas" className="admin-nav-item">📨 Propostas</Link>
            <Link href="/admin/noticias" className="admin-nav-item">📰 Notícias</Link>
            <Link href="/admin/eventos" className="admin-nav-item">📅 Eventos</Link>
            <Link href="/admin/banners" className="admin-nav-item">🖼️ Banners</Link>
            <Link href="/admin/galeria" className="admin-nav-item">📷 Galeria</Link>
          </nav>

          <button
            onClick={handleLogout}
            className="admin-nav-item"
            style={{
              marginTop: "auto",
              background: "none",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            🚪 Sair
          </button>
        </aside>

        <main className="admin-main">
          <section className="admin-content-shell">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}







