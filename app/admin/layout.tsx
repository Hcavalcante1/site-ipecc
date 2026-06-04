"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminToast from "@/components/AdminToast";
import AdminFeedbackBridge from "@/components/AdminFeedbackBridge";
import AdminConfirmModal from "@/components/AdminConfirmModal";
import AdminButtonBridge from "@/components/AdminButtonBridge";
import AdminFormBridge from "@/components/AdminFormBridge";

const ADMIN_ACTIVE_KEY = "ipecc_admin_active";
const ADMIN_CLOSED_KEY = "ipecc_admin_closed";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function encerrarSessaoAdmin() {
      sessionStorage.removeItem(ADMIN_ACTIVE_KEY);
      await fetch("/api/logout", { method: "POST", keepalive: true }).catch(
        () => null
      );
      await supabase.auth.signOut().catch(() => null);
    }

    async function checkAuth() {
      if (
        localStorage.getItem(ADMIN_CLOSED_KEY) === "1" ||
        sessionStorage.getItem(ADMIN_ACTIVE_KEY) !== "1"
      ) {
        await encerrarSessaoAdmin();
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });

      if (error || !isAdmin) {
        await encerrarSessaoAdmin();
        router.replace("/");
        return;
      }

      if (mounted) setChecking(false);
    }

    async function renovarEntradaAdmin() {
      if (sessionStorage.getItem(ADMIN_ACTIVE_KEY) !== "1") return;
      await fetch("/api/admin/session", { method: "POST" }).catch(() => null);
    }

    checkAuth();
    const heartbeat = window.setInterval(renovarEntradaAdmin, 4000);

    function marcarAdminComoFechado() {
      localStorage.setItem(ADMIN_CLOSED_KEY, "1");
      sessionStorage.removeItem(ADMIN_ACTIVE_KEY);
      navigator.sendBeacon?.("/api/logout");
    }

    window.addEventListener("pagehide", marcarAdminComoFechado);
    window.addEventListener("beforeunload", marcarAdminComoFechado);

    return () => {
      mounted = false;
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", marcarAdminComoFechado);
      window.removeEventListener("beforeunload", marcarAdminComoFechado);
    };
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
            <Link href="/admin" className={navClass(pathname, "/admin", true)}>
              Dashboard
            </Link>

            <div className="admin-nav-section-title">Conteudo</div>
            <Link href="/admin/paginas" className={navClass(pathname, "/admin/paginas")}>
              Paginas
            </Link>
            <Link href="/admin/editais" className={navClass(pathname, "/admin/editais")}>
              Editais
            </Link>
            <Link href="/admin/noticias" className={navClass(pathname, "/admin/noticias")}>
              Noticias
            </Link>
            <Link href="/admin/eventos" className={navClass(pathname, "/admin/eventos")}>
              Eventos
            </Link>

            <div className="admin-nav-section-title">Operacao</div>
            <Link href="/admin/propostas" className={navClass(pathname, "/admin/propostas")}>
              Propostas
            </Link>
            <Link href="/admin/certidoes" className={navClass(pathname, "/admin/certidoes")}>
              Certidoes
            </Link>
            <Link href="/admin/whatsapp" className={navClass(pathname, "/admin/whatsapp")}>
              WhatsApp
            </Link>
            <Link href="/admin/logs" className={navClass(pathname, "/admin/logs")}>
              Logs
            </Link>
          </nav>
        </aside>

        <main className="admin-main">
          <section className="admin-content-shell">{children}</section>
        </main>
      </div>

      <AdminToast />
      <AdminFeedbackBridge />
      <AdminConfirmModal />
      <AdminButtonBridge />
      <AdminFormBridge />
    </div>
  );
}

function navClass(pathname: string, href: string, exact = false) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return active ? "admin-nav-item admin-nav-item--active" : "admin-nav-item";
}
