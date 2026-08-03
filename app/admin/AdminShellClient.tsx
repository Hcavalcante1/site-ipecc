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
import LogoutButton from "./components/LogoutButton";
import AdminNavIcon, { type AdminNavIconName } from "./components/AdminNavIcon";
import { caminhoEhCmsSite } from "./components/RequireAdminModulo";
import AdminNotificacoes from "@/components/AdminNotificacoes";

const ADMIN_ACTIVE_KEY = "ipecc_admin_active";
const ADMIN_CLOSED_KEY = "ipecc_admin_closed";

function NavLabel({
  icon,
  children,
}: {
  icon: AdminNavIconName;
  children: ReactNode;
}) {
  return (
    <>
      <span className="admin-nav-icon" aria-hidden>
        <AdminNavIcon name={icon} size={18} />
      </span>
      <span className="admin-nav-label">{children}</span>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Menu aparece imediatamente; a sessão só ajusta os módulos depois
  const [checking, setChecking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modulos, setModulos] = useState<AdminModulo[]>([...MODULOS_MESTRE]);
  const [userEmail, setUserEmail] = useState("");

  const [avisoSemEscopo, setAvisoSemEscopo] = useState(false);

  const pode = useMemo(() => {
    const set = new Set(modulos);
    return (m: AdminModulo) => set.has(m);
  }, [modulos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ipecc_admin_aviso_sem_escopo") === "1") {
      setAvisoSemEscopo(true);
      sessionStorage.removeItem("ipecc_admin_aviso_sem_escopo");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function encerrarSessaoAdmin() {
      sessionStorage.removeItem(ADMIN_ACTIVE_KEY);
      await fetch("/api/logout", { method: "POST", keepalive: true }).catch(
        () => null
      );
      await supabase.auth.signOut().catch(() => null);
    }

    function aplicarModulosSessao(json: {
      modulos?: AdminModulo[];
      mestre?: boolean;
    }) {
      if (!mounted) return;
      if (json.mestre) {
        setModulos([...MODULOS_MESTRE]);
        setAvisoSemEscopo(false);
        return;
      }
      const lista =
        Array.isArray(json.modulos) && json.modulos.length > 0
          ? json.modulos
          : [];
      setModulos(lista);
      if (lista.length === 0) {
        setAvisoSemEscopo(true);
      }
    }

    async function checkAuth() {
      setChecking(true);
      try {
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

        if (mounted) {
          setUserEmail(user.email || "");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const sessionRes = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "include",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        }).catch(() => null);

        if (!sessionRes || !sessionRes.ok) {
          const { data: autorizado, error: gateErr } = await supabase.rpc(
            "is_admin_ou_perfil",
            { p_user_id: user.id }
          );
          if (gateErr || !autorizado) {
            const { data: isAdmin, error } = await supabase.rpc("is_admin", {
              user_id: user.id,
            });
            if (error || !isAdmin) {
              await encerrarSessaoAdmin();
              router.replace("/login");
              return;
            }
            if (mounted) {
              setModulos([...MODULOS_MESTRE]);
              setAvisoSemEscopo(false);
            }
            return;
          }

          const retry = await fetch("/api/admin/session", {
            method: "POST",
            credentials: "include",
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : undefined,
          }).catch(() => null);
          if (retry?.ok) {
            const json = (await retry.json()) as {
              modulos?: AdminModulo[];
              mestre?: boolean;
            };
            aplicarModulosSessao(json);
            return;
          }

          // Perfil ok mas session falhou: mantém menu para não ficar em branco
          if (mounted) {
            setModulos([...MODULOS_MESTRE]);
          }
          return;
        }

        const json = (await sessionRes.json()) as {
          ok?: boolean;
          modulos?: AdminModulo[];
          mestre?: boolean;
        };

        aplicarModulosSessao(json);
      } catch (err) {
        console.error("Falha ao verificar sessão admin:", err);
        if (mounted) {
          setModulos((prev) => (prev.length > 0 ? prev : [...MODULOS_MESTRE]));
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    async function renovarEntradaAdmin() {
      if (sessionStorage.getItem(ADMIN_ACTIVE_KEY) !== "1") return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      }).catch(() => null);
    }

    void checkAuth();
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

  function handleMobileNav(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (window.innerWidth > 900) return;
    event.preventDefault();
    setMenuOpen(false);
    router.push(href);
  }

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
            <Link href="/admin" className={navClass(pathname, "/admin", true)} onClick={(event) => handleMobileNav(event, "/admin")}>
              <NavLabel icon="dashboard">Painel</NavLabel>
            </Link>

            <div className="admin-nav-section-title">Conteudo</div>
            {pode("paginas") && (
              <Link
                href="/admin/paginas"
                className={
                  caminhoEhCmsSite(pathname) || pathname === "/admin/paginas"
                    ? "admin-nav-item admin-nav-item--active"
                    : "admin-nav-item"
                }
                onClick={(event) => handleMobileNav(event, "/admin/paginas")}
              >
                <NavLabel icon="pages">Paginas</NavLabel>
              </Link>
            )}
            {pode("projetos") && (
              <Link
                href="/admin/paginas/projetos"
                className={navClass(pathname, "/admin/paginas/projetos")}
                onClick={(event) => handleMobileNav(event, "/admin/paginas/projetos")}
              >
                <NavLabel icon="pages">Projetos</NavLabel>
              </Link>
            )}
            {pode("editais") && (
              <Link href="/admin/editais" className={navClass(pathname, "/admin/editais")} onClick={(event) => handleMobileNav(event, "/admin/editais")}>
                <NavLabel icon="editais">Editais</NavLabel>
              </Link>
            )}
            {pode("noticias") && (
              <Link href="/admin/noticias" className={navClass(pathname, "/admin/noticias")} onClick={(event) => handleMobileNav(event, "/admin/noticias")}>
                <NavLabel icon="noticias">Noticias</NavLabel>
              </Link>
            )}
            {pode("eventos") && (
              <Link href="/admin/eventos" className={navClass(pathname, "/admin/eventos")} onClick={(event) => handleMobileNav(event, "/admin/eventos")}>
                <NavLabel icon="eventos">Eventos</NavLabel>
              </Link>
            )}

            <div className="admin-nav-section-title">Operacao</div>
            <Link href="/admin/alertas" className={navClass(pathname, "/admin/alertas")} onClick={(event) => handleMobileNav(event, "/admin/alertas")}>
              <NavLabel icon="logs">Central de Alertas</NavLabel>
            </Link>
            {pode("propostas") && (
              <Link href="/admin/propostas" className={navClass(pathname, "/admin/propostas")} onClick={(event) => handleMobileNav(event, "/admin/propostas")}>
                <NavLabel icon="propostas">Propostas</NavLabel>
              </Link>
            )}
            <Link href="/admin/beneficiarios" className={navClass(pathname, "/admin/beneficiarios")} onClick={(event) => handleMobileNav(event, "/admin/beneficiarios")}>
              <NavLabel icon="acessos">Beneficiários</NavLabel>
            </Link>
            <Link
              href="/admin/relatorios"
              className={navClass(pathname, "/admin/relatorios")}
              onClick={(event) => handleMobileNav(event, "/admin/relatorios")}
            >
              <NavLabel icon="logs">Relatórios</NavLabel>
            </Link>
            {pode("transparencia") && (
              <Link
                href="/admin/paginas/transparencia"
                className={navClass(pathname, "/admin/paginas/transparencia")}
                onClick={(event) =>
                  handleMobileNav(event, "/admin/paginas/transparencia")
                }
              >
                <NavLabel icon="transparencia">Transparencia</NavLabel>
              </Link>
            )}
            {pode("certidoes") && (
              <Link href="/admin/certidoes" className={navClass(pathname, "/admin/certidoes")} onClick={(event) => handleMobileNav(event, "/admin/certidoes")}>
                <NavLabel icon="certidoes">Certidoes</NavLabel>
              </Link>
            )}
            {pode("whatsapp") && (
              <Link href="/admin/whatsapp" className={navClass(pathname, "/admin/whatsapp")} onClick={(event) => handleMobileNav(event, "/admin/whatsapp")}>
                <NavLabel icon="whatsapp">WhatsApp</NavLabel>
              </Link>
            )}
            {pode("digital") && (
              <Link href="/admin/digital" className={navClass(pathname, "/admin/digital")} onClick={(event) => handleMobileNav(event, "/admin/digital")}>
                <NavLabel icon="digital">Digital</NavLabel>
              </Link>
            )}
            {/* Sempre visível após login — o gate fino fica no layout do módulo */}
            <Link
              href="/admin/documentos/dashboard"
              className={navClass(pathname, "/admin/documentos")}
              onClick={(event) =>
                handleMobileNav(event, "/admin/documentos/dashboard")
              }
            >
              <NavLabel icon="documentos">Gestão Documental</NavLabel>
            </Link>
            <Link
              href="/admin/diagnostico"
              className={navClass(pathname, "/admin/diagnostico")}
              onClick={(event) => handleMobileNav(event, "/admin/diagnostico")}
            >
              <NavLabel icon="digital">Diagnóstico</NavLabel>
            </Link>
            {pode("logs") && (
              <Link href="/admin/logs" className={navClass(pathname, "/admin/logs")} onClick={(event) => handleMobileNav(event, "/admin/logs")}>
                <NavLabel icon="logs">Registros</NavLabel>
              </Link>
            )}

            {(pode("processos") || pode("acessos")) && (
              <>
                <div className="admin-nav-section-title">Governanca</div>
                <Link href="/admin/portal" className={navClass(pathname, "/admin/portal")} onClick={(event) => handleMobileNav(event, "/admin/portal")}>
                  <NavLabel icon="acessos">Portal Financiador</NavLabel>
                </Link>
                <Link href="/admin/lgpd" className={navClass(pathname, "/admin/lgpd")} onClick={(event) => handleMobileNav(event, "/admin/lgpd")}>
                  <NavLabel icon="logs">LGPD / Privacidade</NavLabel>
                </Link>
                <Link href="/admin/api-tokens" className={navClass(pathname, "/admin/api-tokens")} onClick={(event) => handleMobileNav(event, "/admin/api-tokens")}>
                  <NavLabel icon="digital">API Tokens</NavLabel>
                </Link>
                <Link href="/admin/organizacao" className={navClass(pathname, "/admin/organizacao", true)} onClick={(event) => handleMobileNav(event, "/admin/organizacao")}>
                  <NavLabel icon="processos">Minha Organização</NavLabel>
                </Link>
                <Link href="/admin/organizacoes" className={navClass(pathname, "/admin/organizacoes")} onClick={(event) => handleMobileNav(event, "/admin/organizacoes")}>
                  <NavLabel icon="acessos">Organizações (SA)</NavLabel>
                </Link>
                <Link href="/admin/faturamento" className={navClass(pathname, "/admin/faturamento")} onClick={(event) => handleMobileNav(event, "/admin/faturamento")}>
                  <NavLabel icon="propostas">Faturamento</NavLabel>
                </Link>
                <Link href="/admin/configuracoes" className={navClass(pathname, "/admin/configuracoes")} onClick={(event) => handleMobileNav(event, "/admin/configuracoes")}>
                  <NavLabel icon="digital">Configurações</NavLabel>
                </Link>
                {pode("processos") && (
                  <Link href="/admin/processos" className={navClass(pathname, "/admin/processos")} onClick={(event) => handleMobileNav(event, "/admin/processos")}>
                    <NavLabel icon="processos">Processos</NavLabel>
                  </Link>
                )}
                {pode("acessos") && (
                  <Link href="/admin/acessos" className={navClass(pathname, "/admin/acessos")} onClick={(event) => handleMobileNav(event, "/admin/acessos")}>
                    <NavLabel icon="acessos">Acessos</NavLabel>
                  </Link>
                )}
              </>
            )}
          </nav>

            <div className="admin-sidebar-footer">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <LogoutButton />
                <AdminNotificacoes />
              </div>

              <div className="admin-sidebar-footer-brand">
                <span
                  className="admin-sidebar-footer-mini"
                  title={userEmail || undefined}
                >
                  {userEmail || "Conta administrativa"}
              </span>
              <span className="admin-sidebar-footer-session">
                Sessão administrativa ativa
              </span>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          {checking ? (
            <div
              style={{
                margin: "12px 16px 0",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(59,130,246,0.12)",
                color: "#bfdbfe",
                fontSize: 13,
              }}
            >
              Atualizando permissões da sessão...
            </div>
          ) : null}
          {avisoSemEscopo ? (
            <div
              style={{
                margin: "12px 16px 0",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #f59e0b",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#fde68a",
                fontSize: 14,
              }}
            >
              Seu login esta ativo, mas ainda nao ha <strong>escopo de modulos</strong>.
              Peça ao mestre para vincular um processo em <strong>/admin/acessos</strong>.
            </div>
          ) : null}
          <section className="admin-content-shell">{children}</section>
          <footer className="admin-main-footer">
            IPECC | Painel administrativo institucional
          </footer>
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
