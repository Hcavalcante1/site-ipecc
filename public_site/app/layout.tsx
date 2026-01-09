// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "APECC — Associação Paulista de Educação, Cultura e Cidadania",
  description: "Site institucional da APECC — Educação, Cultura e Cidadania",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* ===== CABEÇALHO FIXO (duas faixas empilhadas) ===== */}
        <header className="header-fixo" role="banner">
          {/* 1) TARJA AZUL-ESCURA (REDES SOCIAIS) */}
          <div className="topbar">
            <div className="container topbar__inner">
              <nav className="social" aria-label="Redes sociais">
                <a href="https://facebook.com/apecc" target="_blank" rel="noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" className="icon-social">
                    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.6V12h2.6V9.6c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.45 2.9h-2.35v7A10 10 0 0 0 22 12z"/>
                  </svg>
                </a>
                <a href="https://instagram.com/apecc" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" className="icon-social">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                  </svg>
                </a>
                <a href="https://youtube.com/@apecc" target="_blank" rel="noreferrer" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" className="icon-social">
                    <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.7 4.5 12 4.5 12 4.5s-7.7 0-9.4.6A3 3 0 0 0 .5 7.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.7.6 9.4.6 9.4.6s7.7 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-4.8zM9.8 15.3V8.7l6.3 3.3-6.3 3.3z"/>
                  </svg>
                </a>
              </nav>
            </div>
          </div>

          {/* 2) LINHA INFERIOR (BRANCA) — LOGO + MENU */}
          <div className="menubar-wrapper">
            <div className="container menubar__inner">
              <a href="/" className="brand" aria-label="APECC — Início">
                <Image
                  src="/media/ipecc_logo_v2.png"
                  alt="Logo APECC"
                  width={240}
                  height={240}
                  className="brand__logo"
                  priority
                />
              </a>

              <nav className="menubar" aria-label="Menu principal">
                <a href="/" className="menu__link">Início</a>
                <a href="/quem-somos" className="menu__link">Quem Somos</a>
                <a href="/projetos" className="menu__link">Projetos</a>

                {/* ALTERADO AQUI */}
                <a href="/editais" className="menu__link">Editais e Chamadas Públicas</a>

                <a href="/transparencia" className="menu__link">Transparência</a>
                <a href="/contato" className="menu__link">Contato</a>
              </nav>
            </div>
          </div>
        </header>

        {/* ===== CONTEÚDO ===== */}
        <main id="conteudo" className="page" role="main">
          {children}
        </main>

        {/* ===== RODAPÉ ===== */}
        <footer className="site-footer" role="contentinfo">
          <div className="container">
            <small>© {new Date().getFullYear()} APECC — Associação Paulista de Educação, Cultura e Cidadania. Todos os direitos reservados.</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
