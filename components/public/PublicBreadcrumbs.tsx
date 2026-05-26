"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  inicio: "Início",
  "quem-somos": "Quem Somos",
  projetos: "Projetos",
  editais: "Editais",
  propostas: "Propostas",
  transparencia: "Transparência",
  contato: "Contato",
  eventos: "Eventos",
  noticias: "Notícias",
  acoes: "Ações",
};

export default function PublicBreadcrumbs() {
  const pathname = usePathname() ?? "";
  if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Portal" },
  ];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label =
      LABELS[segment] ||
      (segment.length > 20 ? "Detalhe" : segment.replace(/-/g, " "));
    crumbs.push({
      href: path,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="public-breadcrumbs" aria-label="Navegação estrutural">
      <ol className="public-breadcrumbs__list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href}>
              {isLast ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link href={crumb.href}>{crumb.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
