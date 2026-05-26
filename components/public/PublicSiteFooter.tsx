import Link from "next/link";
import PublicSocialLinks from "./PublicSocialLinks";

const FOOTER_LINKS = [
  { href: "/", label: "Portal" },
  { href: "/inicio", label: "Início" },
  { href: "/projetos", label: "Projetos" },
  { href: "/editais", label: "Editais" },
  { href: "/propostas", label: "Propostas" },
  { href: "/transparencia", label: "Transparência" },
  { href: "/contato", label: "Contato" },
] as const;

export default function PublicSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <p className="site-footer__name">IPECC</p>
          <p className="site-footer__tagline">
            Instituto Paulista de Esporte, Cultura e Cidadania
          </p>
          <p className="site-footer__meta">CNPJ: 05.965.225/0001-04</p>
        </div>

        <nav className="site-footer__nav" aria-label="Links institucionais">
          <p className="site-footer__nav-title">Navegação</p>
          <ul>
            {FOOTER_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__contact">
          <p className="site-footer__nav-title">Contato</p>
          <p>
            <Link href="/contato">Fale com o IPECC</Link>
          </p>
          <PublicSocialLinks variant="footer" />
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          © {year} IPECC. Todos os direitos reservados.{" "}
          <Link href="/transparencia">Transparência</Link>
        </p>
      </div>
    </footer>
  );
}
