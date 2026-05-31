import Link from "next/link";
import type { ReactNode } from "react";

export type AdminHubCardProps = {
  titulo: string;
  descricao?: string;
  href: string;
  /** Texto do botão verde (padrão: Editar) */
  label?: string;
};

/** Card de hub com botão verde padronizado (Link + .admin-button). */
export default function AdminHubCard({
  titulo,
  descricao,
  href,
  label = "Editar",
}: AdminHubCardProps) {
  return (
    <section className="admin-card admin-hub-card">
      <h3>{titulo}</h3>
      {descricao ? <p>{descricao}</p> : null}
      <Link href={href} className="admin-button">
        {label}
      </Link>
    </section>
  );
}

export type AdminHubNavCardProps = {
  titulo: string;
  href: string;
  label?: string;
};

/** Card inteiro clicável (hub principal /admin/paginas). */
export function AdminHubNavCard({
  titulo,
  href,
  label = "Editar",
}: AdminHubNavCardProps) {
  return (
    <Link href={href} className="admin-card admin-card-link">
      <h3>{titulo}</h3>
      <span className="admin-button">{label}</span>
    </Link>
  );
}

export type AdminPaginasHubLayoutProps = {
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
};

/** Cabeçalho padrão dos hubs de páginas internas. */
export function AdminPaginasHubLayout({
  titulo,
  subtitulo,
  children,
  extra,
}: AdminPaginasHubLayoutProps) {
  return (
    <div className="admin-box admin-hub-page">
      <h1 className="admin-h1">{titulo}</h1>
      {subtitulo ? <p className="admin-subtitle">{subtitulo}</p> : null}
      {extra}
      {children}
    </div>
  );
}
