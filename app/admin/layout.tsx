"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminToast from "@/components/AdminToast";
import AdminFeedbackBridge from "@/components/AdminFeedbackBridge";
import AdminConfirmModal from "@/components/AdminConfirmModal";
import AdminButtonBridge from "@/components/AdminButtonBridge";
import AdminFormBridge from "@/components/AdminFormBridge";
import type { AdminModulo } from "@/lib/auth/adminEscopo";
import { MODULOS_MESTRE } from "@/lib/auth/adminEscopo";

const ADMIN_ACTIVE_KEY = "ipecc_admin_active";
const ADMIN_CLOSED_KEY = "ipecc_admin_closed";

type NavItem = { href: string; label: string; modulo?: AdminModulo };

const NAV_CONTEUDO: NavItem[] = [
  { href: "/admin/paginas", label: "Paginas", modulo: "paginas" },
  { href: "/admin/editais", label: "Editais", modulo: "editais" },
  { href: "/admin/noticias", label: "Noticias", modulo: "noticias" },
  { href: "/admin/eventos", label: "Eventos", modulo: "eventos" },
];

const NAV_OPERACAO: NavItem[] = [
  { href: "/admin/propostas", label: "Propostas", modulo: "propostas" },
  { href: "/admin/certidoes", label: "Certidoes", modulo: "certidoes" },
  { href: "/admin/whatsapp", label: "WhatsApp", modulo: "whatsapp" },
  { href: "/admin/logs", label: "Logs", modulo: "logs" },
];

const NAV_GOVERNANCA: NavItem[] = [
  { href: "/admin/processos", label: "Processos", modulo: "processos" },
  { href: "/admin/acessos", label: "Acessos", modulo: "acessos" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modulos, setModulos] = useState<AdminModulo[]>([...MODULOS_MESTRE]);

  const pode = useMemo(() => {
    const set = new Set(modulos);
    return (m?: AdminModulo) => (m ? set.has(m) : true);
  }, [modulos]);

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

      const sessionRes = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);

      if (!sessionRes || !sessionRes.ok) {
        // Fallback legado is_admin (antes do SQL Fase 1)
        const { data: isAdmin, error } = await supabase.rpc("is_admin", {
          user_id: user.id,
        });
        if (error || !isAdmin) {
          await encerrarSessaoAdmin();
          router.replace("/");
          return;
        }
        if (mounted) {
          setModulos([...MODULOS_MESTRE]);
          setChecking(false);
        }
        return;
      }

      const json = (await sessionRes.json()) as {
        ok?: boolean;
        papel?: string;
        modulos?: AdminModulo[];
      };

      if (mounted) {
        setModulos(
          Array.isArray(json.modulos) && json.modulos.length > 0
            ? json.modulos
            : [...MODULOS_MESTRE]
        );
        setChecking(false);
      }
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

  function handleMobileNav(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (window.innerWidth > 900) return;
    event.preventDefault();
    setMenuOpen(false);
    router.push(href);
  }

  const conteudo = NAV_CONTEUDO.filter((i) => pode(i.modulo));
  const operacao = NAV_OPERACAO.filter((i) => pode(i.modulo));
  const governanca = NAV_GOVERNANCA.filter((i) => pode(i.modulo));

  return (
    <div className="admin-body">
      <header className="admin-mobile-header">
        <img src="/media/ipecc_logo_v2.png" alt="IPECC" className="admin-mobile-logo" />
        <button
          type="button"
          className="admin-mobile-menu-button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-menu"
        >
          {menuOpen ? "Fechar" : "Menu"}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="admin-mobile-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="admin-wrapper">
        <aside
          id="admin-mobile-menu"
          className={`admin-sidebar ${menuOpen ? "admin-sidebar--open" : ""}`}
        >
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
            <Link
              href="/admin"
              className={navClass(pathname, "/admin", true)}
              onClick={(event) => handleMobileNav(event, "/admin")}
            >
              Dashboard
            </Link>

            {conteudo.length > 0 ? (
              <>
                <div className="admin-nav-section-title">Conteudo</div>
                {conteudo.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navClass(pathname, item.href)}
                    onClick={(event) => handleMobileNav(event, item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : null}

            {operacao.length > 0 ? (
              <>
                <div className="admin-nav-section-title">Operacao</div>
                {operacao.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navClass(pathname, item.href)}
                    onClick={(event) => handleMobileNav(event, item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : null}

            {governanca.length > 0 ? (
              <>
                <div className="admin-nav-section-title">Governanca</div>
                {governanca.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navClass(pathname, item.href)}
                    onClick={(event) => handleMobileNav(event, item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : null}
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
