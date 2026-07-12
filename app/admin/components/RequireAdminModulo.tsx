"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AdminModulo } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

/**
 * Site institucional = so mestre / modulo paginas.
 * Processo = editais, propostas, transparencia (ciclo), projetos do processo.
 */
export function caminhoEhCmsSite(pathname: string): boolean {
  if (!pathname.startsWith("/admin/paginas")) return false;

  // Hub e blocos de ciclo da Transparencia (processo)
  if (pathname === "/admin/paginas/transparencia") return false;
  if (pathname.startsWith("/admin/paginas/transparencia/convenios")) return false;
  if (pathname.startsWith("/admin/paginas/transparencia/editais")) return false;
  if (pathname.startsWith("/admin/paginas/transparencia/prestacao")) return false;

  // Projetos vinculados ao processo
  if (pathname.startsWith("/admin/paginas/projetos")) return false;

  // Todo o resto sob /admin/paginas e CMS institucional
  return true;
}

export function caminhoEhProjetosProcesso(pathname: string): boolean {
  return pathname.startsWith("/admin/paginas/projetos");
}

export function caminhoEhTransparenciaCiclo(pathname: string): boolean {
  return (
    pathname === "/admin/paginas/transparencia" ||
    pathname.startsWith("/admin/paginas/transparencia/convenios") ||
    pathname.startsWith("/admin/paginas/transparencia/editais") ||
    pathname.startsWith("/admin/paginas/transparencia/prestacao")
  );
}

type Props = {
  children: ReactNode;
  /** Se definido, exige este modulo (mestre sempre passa). */
  modulo?: AdminModulo;
};

export default function RequireAdminModulo({ children, modulo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const escopo = useAdminEscopoCliente();

  const permitido = (() => {
    if (escopo.loading) return null;
    if (escopo.mestre) return true;

    const mods = new Set(escopo.modulos);

    if (modulo) {
      return mods.has(modulo);
    }

    // Guard generico para arvore /admin/paginas
    if (caminhoEhProjetosProcesso(pathname)) {
      return mods.has("projetos") || mods.has("paginas");
    }
    if (caminhoEhTransparenciaCiclo(pathname)) {
      return mods.has("transparencia") || mods.has("paginas");
    }
    if (caminhoEhCmsSite(pathname)) {
      return mods.has("paginas");
    }
    return true;
  })();

  useEffect(() => {
    if (permitido === false) {
      router.replace("/admin");
    }
  }, [permitido, router]);

  if (escopo.loading || permitido === null) {
    return (
      <div style={{ padding: 24, color: "#e5e7eb" }}>Verificando acesso...</div>
    );
  }

  if (!permitido) {
    const msg =
      modulo === "processos" || modulo === "acessos"
        ? "Acesso restrito ao administrador mestre."
        : "Acesso negado. Este conteúdo é do site institucional IPECC e não faz parte do seu processo.";
    return <div style={{ padding: 24, color: "#e5e7eb" }}>{msg}</div>;
  }

  return <>{children}</>;
}
