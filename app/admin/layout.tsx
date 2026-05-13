"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminToast from "@/components/AdminToast";
import AdminFeedbackBridge from "@/components/AdminFeedbackBridge";
import AdminConfirmModal from "@/components/AdminConfirmModal";
import AdminButtonBridge from "@/components/AdminButtonBridge";
import AdminFormBridge from "@/components/AdminFormBridge";
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="admin-body">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e5e7eb",
            fontSize: 16,
          }}
        >
          Verificando acesso...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-body">
      <div className="admin-wrapper">
        <aside className="admin-sidebar">
          <div className="admin-logo" style={{ justifyContent: "center" }}>
            <img
              src="/media/ipecc_logo_v2.png"
              alt="IPECC"
              style={{
                maxWidth: "160px",
                width: "100%",
                height: "auto",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-item">🏠 Dashboard</Link>
            <Link href="/admin/paginas" className="admin-nav-item">📄 Páginas</Link>
            <Link href="/admin/editais" className="admin-nav-item">📑 Editais</Link>
            <Link href="/admin/propostas" className="admin-nav-item">📨 Propostas</Link>
            <Link href="/admin/noticias" className="admin-nav-item">📰 Notícias</Link>
            <Link href="/admin/eventos" className="admin-nav-item">📅 Eventos</Link>
	    <Link href="/admin/logs" className="admin-nav-item">
 		📊 Logs
	    </Link>
          </nav>
        </aside>

        <main className="admin-main">
          <section className="admin-content-shell">
            {children}
          </section>
        </main>
      </div>

      {/* 🔥 TOAST GLOBAL */}

<AdminToast />
<AdminFeedbackBridge />
<AdminConfirmModal />
<AdminButtonBridge />
<AdminFormBridge />     
    </div>
  );
}