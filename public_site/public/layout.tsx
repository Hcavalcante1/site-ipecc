// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";

// Logo dentro de app/media (provisório para não depender de /public)
const logoApecc =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='68' height='68' viewBox='0 0 68 68'><rect rx='14' width='68' height='68' fill='%230b2a6b'/><text x='34' y='40' font-size='20' fill='white' text-anchor='middle' font-family='Arial'>APECC</text></svg>";

export const metadata: Metadata = {
  title: "APECC — Associação Paulista de Educação, Cultura e Cidadania",
  description: "Site institucional APECC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="with-top-fixed">
        {/* ===== TOPO FIXO (NÃO ROLA) ===== */}
        <header className="site-fixed" role="banner">
          {/* 1) Barra azul-marinho com logo + redes */}
          <div className="navybar">
            <div className="navybar__inner">
              <a href="/" className="brand" aria-label="APECC — Início">
                <Image
                  src={logoApecc}
                  alt="APECC"
                  className="brand__logo"
                  width={68}
                  height={68}
                  priority
                />
                <span className="brand__name">ASSOCIAÇÃO PAULISTA</span>
              </a>

              <nav className="social" aria-label="Redes sociais">
                <a href="https://facebook.com/apecc" target="_blank" rel="noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" className="icon-social"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.6V12h2.6V9.6c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.45 2.9h-2.35v7A10 10 0 0 0 22 12z"/></svg>
                </a>
                <a href="https://instagram.com/apecc" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" className="icon-social"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                </a>
                <a href="https://youtube.com/@apecc" target="_blank" rel="noreferrer" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" className="icon-social"><path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.7 4.5 12 4.5 12 4.5s-7.7 0-9.4.6A3 3 0 0 0 .5 7.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.7.6 9.4.6 9.4.6s7.7 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-4.8zM9.8 15.3V8.7l6.3 3.3-6.3 3.3z"/></svg>
                </a>
                {/* Botão "Buscar Editais" REMOVIDO conforme solicitado */}
              </nav>
            </div>
          </div>

          {/* 2) Menubar com as páginas */}
          <div className="menubar">
            <nav className="menubar__inner" aria-label="Menu principal">
              <a href="/" className="menu__link">Início</a>
              <a href="/quem-somos" className="menu__link">Quem Somos</a>
              <a href="/projetos" className="menu__link">Projetos</a>
              <a href="/cotacoes" className="menu__link">Cotações</a>
              <a href="/transparencia" className="menu__link">Transparência</a>
              <a href="/contato" className="menu__link">Contato</a>
            </nav>
          </div>

          {/* 3) Tarja azul em degradê (CTA) — FIXA */}
          <div className="hero-fixed">
            <div className="hero-fixed__inner">
              <h1 className="hero-fixed__title">Educação, Cultura e Cidadania</h1>
              <p className="hero-fixed__text">
                Promovemos projetos e ações para fortalecer a educação, a cultura e a
                cidadania no Estado de São Paulo.
              </p>
              <a href="/projetos" className="btn btn--light">Conheça nossos projetos</a>
            </div>
          </div>
        </header>

        {/* ===== CONTEÚDO QUE ROLA ===== */}
        <main id="conteudo" className="page" role="main">
          {children}
        </main>

        {/* ===== Tarja verde no final da página (antes do rodapé) ===== */}
        <div
          className="tailbar"
          aria-hidden="true"
          style={{
            marginTop: "32px",
            background:
              "linear-gradient(90deg, #01c2a4 0%, #16a34a 50%, #22c55e 100%)",
            height: "56px",
            borderRadius: "14px",
            width: "min(1140px, 92%)",
            marginInline: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        />

        <footer className="site-footer" role="contentinfo">
          <div className="container">
            <small>© {new Date().getFullYear()} APECC — Associação Paulista. Todos os direitos reservados.</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
