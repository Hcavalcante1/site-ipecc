"use client";

import "./globals.css";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import WhatsAppFloatingChat, {
  WhatsAppChatProvider,
  useWhatsAppChat,
} from "@/components/public/WhatsAppFloatingChat";

function PublicSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openPanel } = useWhatsAppChat();

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

  return (
    <>
      <div className="topbar">
        <div className="topbar__inner">
          <div className="social">
            <a
              href="https://www.instagram.com/ipecc.sp/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="social-link"
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.4 2h9.2A5.4 5.4 0 0 1 22 7.4v9.2A5.4 5.4 0 0 1 16.6 22H7.4A5.4 5.4 0 0 1 2 16.6V7.4A5.4 5.4 0 0 1 7.4 2Zm0 2A3.4 3.4 0 0 0 4 7.4v9.2A3.4 3.4 0 0 0 7.4 20h9.2a3.4 3.4 0 0 0 3.4-3.4V7.4A3.4 3.4 0 0 0 16.6 4H7.4Zm4.6 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm5.1-2.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
              </svg>
            </a>

            <a
              href="https://www.facebook.com/profile.php?id=61580740405079"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="social-link"
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 22v-7h2.6l.4-3H13.5V10c0-.9.3-1.5 1.6-1.5h1.7V6a20 20 0 0 0-2.4-.1c-2.3 0-3.9 1.4-3.9 4V12H8v3h2.5v7h3Z" />
              </svg>
            </a>

            <a
              href="https://www.youtube.com/@InstitutoPaulistaIPECC"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="social-link"
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.5 7.4a3 3 0 0 0-2.1-2.1C17.6 4.9 12 4.9 12 4.9s-5.6 0-7.4.4A3 3 0 0 0 2.5 7.4 31 31 0 0 0 2.1 12c0 1.5.2 3.1.4 4.6a3 3 0 0 0 2.1 2.1c1.8.4 7.4.4 7.4.4s5.6 0 7.4-.4a3 3 0 0 0 2.1-2.1c.2-1.5.4-3.1.4-4.6 0-1.5-.2-3.1-.4-4.6ZM10.2 15.2V8.8L15.8 12l-5.6 3.2Z" />
              </svg>
            </a>

            <a
              href="https://www.linkedin.com/in/instituto-paulista-ipecc-9037b73b6/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="social-link"
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.8 9.2H4.1V20h2.7V9.2Zm.2-3.4c0 .9-.7 1.6-1.7 1.6S3.6 6.7 3.6 5.8c0-.9.7-1.6 1.7-1.6S7 4.9 7 5.8ZM20.8 20h-2.7v-5.6c0-1.3-.5-2.2-1.8-2.2-1 0-1.6.7-1.9 1.3-.1.2-.1.5-.1.8V20h-2.7s.1-9.4 0-10.8h2.7v1.5c.4-.7 1.2-1.7 3-1.7 2.2 0 3.9 1.5 3.9 4.8V20Z" />
              </svg>
            </a>

            <a
              href="https://www.tiktok.com/@ipecc.sp"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="social-link"
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.7 2h-2.6v12.1a3.4 3.4 0 1 1-2.9-3.4V8a5.9 5.9 0 1 0 5.5 5.9V8.5c1.1 1 2.6 1.6 4.2 1.6V7.6c-1.9 0-3.5-1.1-4.2-2.7-.4-.9-.6-1.8-.6-2.9Z" />
              </svg>
            </a>

            <button
              type="button"
              className="social-link"
              aria-label="WhatsApp — atendimento"
              onClick={() => openPanel()}
            >
              <svg className="icon-social" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 0 14c-1.2 0-2.3-.3-3.3-.8l-.3-.2-2.7.7.7-2.6-.2-.3A7 7 0 0 1 12 5Zm-2 3.1c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1 2.4.2.4 1.4 2.3 3.4 3.1 2 .8 2 .6 2.4.6.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.7-.3l-1.2-.6c-.2-.1-.4-.1-.6.1l-.5.7c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.8-1.2-.7-.6-1.1-1.4-1.2-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.1-.2.2-.3.1-.2.1-.3 0-.4l-.6-1.4c-.2-.4-.3-.4-.5-.4Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <header className="header-fixo" role="banner">
        <div className="menubar-wrapper">
          <div className="container menubar__inner">
            <a href="/" className="brand">
              <Image
                src="/media/global/logos/ipecc_logo_v2.png"
                alt="Logo"
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
              <a href="/" className="menu__link" onClick={() => setMenuOpen(false)}>
                Início
              </a>
              <a
                href="/quem-somos"
                className="menu__link"
                onClick={() => setMenuOpen(false)}
              >
                Quem Somos
              </a>
              <a
                href="/projetos"
                className="menu__link"
                onClick={() => setMenuOpen(false)}
              >
                Projetos
              </a>
              <a
                href="/editais"
                className="menu__link"
                onClick={() => setMenuOpen(false)}
              >
                Editais
              </a>
              <a
                href="/transparencia"
                className="menu__link"
                onClick={() => setMenuOpen(false)}
              >
                Transparência
              </a>
              <a
                href="/contato"
                className="menu__link"
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

      <main className="page">{children}</main>

      <footer className="site-footer">
        © {new Date().getFullYear()} IPECC — Instituto Paulista de Esporte,
        Cultura e Cidadania. CNPJ: 05.965.225/0001-04. Todos os direitos
        reservados.
      </footer>

      <WhatsAppFloatingChat />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isInternal =
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app");

  return (
    <html lang="pt-BR">
      <body>
        {isInternal ? (
          children
        ) : (
          <WhatsAppChatProvider>
            <PublicSiteShell>{children}</PublicSiteShell>
          </WhatsAppChatProvider>
        )}
      </body>
    </html>
  );
}
