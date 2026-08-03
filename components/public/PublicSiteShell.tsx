"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import WhatsAppFloatingChat, {
  WhatsAppChatProvider,
} from "@/components/public/WhatsAppFloatingChat";
import WhatsAppSiteBotFab from "@/components/public/WhatsAppSiteBotFab";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicBreadcrumbs from "@/components/public/PublicBreadcrumbs";
import PublicSocialLinks from "@/components/public/PublicSocialLinks";
import CookieConsent from "@/components/public/CookieConsent";

function navLinkClass(pathname: string, href: string): string {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return active ? "menu__link menu__link--active" : "menu__link";
}

function JsonLdScript({ data }: { data: object | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function PublicSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  const isInternal =
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isInternal) {
    return children;
  }

  return (
    <WhatsAppChatProvider>
      <JsonLdScript data={organizationJsonLd()} />
      <JsonLdScript data={websiteJsonLd()} />
      <JsonLdScript data={breadcrumbJsonLd(pathname)} />

      <div className="topbar">
        <div className="topbar__inner">
          <PublicSocialLinks variant="topbar" />
        </div>
      </div>

      <header className="header-fixo" role="banner">
        <div className="menubar-wrapper">
          <div className="container menubar__inner">
            <a href="/" className="brand" aria-label="IPECC - página inicial">
              <Image
                src="/media/global/logos/ipecc_logo_v2.png"
                alt="IPECC - Instituto Paulista de Esporte, Cultura e Cidadania"
                width={140}
                height={140}
                className="brand__logo"
                priority
              />
            </a>

            <button
              type="button"
              className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>

            <nav
              id="site-menu"
              className={`menubar ${menuOpen ? "menubar--open" : ""}`}
            >
              <a
                href="/"
                className={navLinkClass(pathname, "/")}
                aria-current={pathname === "/" ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                Portal
              </a>
              <a
                href="/inicio"
                className={navLinkClass(pathname, "/inicio")}
                aria-current={pathname.startsWith("/inicio") ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                Início
              </a>
              <a
                href="/quem-somos"
                className={navLinkClass(pathname, "/quem-somos")}
                aria-current={
                  pathname.startsWith("/quem-somos") ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                Quem Somos
              </a>
              <a
                href="/projetos"
                className={navLinkClass(pathname, "/projetos")}
                aria-current={
                  pathname.startsWith("/projetos") ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                Projetos
              </a>
              <a
                href="/editais"
                className={navLinkClass(pathname, "/editais")}
                aria-current={
                  pathname.startsWith("/editais") ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                Editais
              </a>
              <a
                href="/transparencia"
                className={navLinkClass(pathname, "/transparencia")}
                aria-current={
                  pathname.startsWith("/transparencia") ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                Transparência
              </a>
              <a
                href="/contato"
                className={navLinkClass(pathname, "/contato")}
                aria-current={
                  pathname.startsWith("/contato") ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                Contato
              </a>
            </nav>
          </div>
        </div>

        {menuOpen && (
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </header>

      <PublicBreadcrumbs />
      <main className="page">{children}</main>

      <PublicSiteFooter />

      <WhatsAppFloatingChat />
      <WhatsAppSiteBotFab />
      <CookieConsent />
    </WhatsAppChatProvider>
  );
}
