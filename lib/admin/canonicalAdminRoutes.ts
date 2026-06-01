/**
 * Rotas canônicas do admin CMS — use com redirect() para eliminar duplicatas.
 * Documentação: docs/ADMIN-ROTAS-CANONICAS.md
 */
export const adminCanonicalRoutes = {
  dashboard: "/admin",
  paginasHub: "/admin/paginas",
  inicio: {
    hero: "/admin/paginas/hero",
    cards: "/admin/paginas/cards",
    destaques: "/admin/paginas/destaques",
    numeros: "/admin/paginas/numeros",
    impacto: "/admin/paginas/impacto",
    depoimentos: "/admin/paginas/depoimentos",
    sobreCta: "/admin/paginas/sobre-cta",
  },
  quemSomos: {
    hub: "/admin/paginas/quem-somos",
    hero: "/admin/paginas/quem-somos/hero",
    blocoPrincipal: "/admin/paginas/quem-somos/bloco-principal",
    mvv: "/admin/paginas/quem-somos/mvv",
    atuacao: "/admin/paginas/quem-somos/atuacao",
    cta: "/admin/paginas/quem-somos/cta",
  },
  projetos: {
    hub: "/admin/paginas/projetos",
    hero: "/admin/paginas/projetos/hero",
    introducao: "/admin/paginas/projetos/introducao",
    eixos: "/admin/paginas/projetos/eixos",
    destaques: "/admin/paginas/projetos/destaques",
    metodologia: "/admin/paginas/projetos/metodologia",
    numeros: "/admin/paginas/projetos/numeros",
    cta: "/admin/paginas/projetos/cta",
  },
  contato: {
    hub: "/admin/paginas/contato",
    hero: "/admin/paginas/contato/hero",
    canais: "/admin/paginas/contato/canais",
    endereco: "/admin/paginas/contato/endereco",
    formulario: "/admin/paginas/contato/formulario",
    cta: "/admin/paginas/contato/cta",
  },
  transparencia: {
    hub: "/admin/paginas/transparencia",
    hero: "/admin/paginas/transparencia/hero",
    compromissos: "/admin/paginas/transparencia/compromissos",
    documentos: "/admin/paginas/transparencia/documentos",
    convenios: "/admin/paginas/transparencia/convenios",
    editais: "/admin/paginas/transparencia/editais",
    prestacao: "/admin/paginas/transparencia/prestacao",
    lgpd: "/admin/paginas/transparencia/lgpd",
    cta: "/admin/paginas/transparencia/cta",
  },
  editaisCms: {
    hub: "/admin/paginas/editais",
    hero: "/admin/paginas/editais/hero",
    textos: "/admin/paginas/editais/textos",
    documentos: "/admin/paginas/editais/documentos",
    mural: "/admin/paginas/editais/mural",
    cta: "/admin/paginas/editais/cta",
  },
  editaisCadastro: {
    lista: "/admin/editais",
    editar: (id: string) => `/admin/editais/${id}`,
  },
} as const;

/** Rotas legadas: page.tsx deve conter apenas redirect() para o destino. */
export const adminLegacyRedirectPages: Record<string, string> = {
  "app/admin/dashboard/page.tsx": adminCanonicalRoutes.dashboard,
  "app/admin/paginas/quem-somos/institucional/page.tsx":
    adminCanonicalRoutes.quemSomos.blocoPrincipal,
  "app/admin/paginas/quem-somos/eixos/page.tsx":
    adminCanonicalRoutes.quemSomos.atuacao,
  "app/admin/paginas/editais/[id]/page.tsx": "(dynamic → editaisCadastro.editar)",
  "app/admin/editais/hero/page.tsx": adminCanonicalRoutes.editaisCms.hero,
  "app/admin/editais/textos/page.tsx": adminCanonicalRoutes.editaisCms.documentos,
  "app/admin/editais/documentos/page.tsx": adminCanonicalRoutes.editaisCms.documentos,
  "app/admin/editais/mural/page.tsx": adminCanonicalRoutes.editaisCms.mural,
  "app/admin/editais/textos/hero/page.tsx": adminCanonicalRoutes.editaisCms.hero,
  "app/admin/editais/textos/nova-secao/page.tsx":
    adminCanonicalRoutes.editaisCms.textos,
  "app/admin/paginas/editais/textos/hero/page.tsx":
    adminCanonicalRoutes.editaisCms.hero,
  "app/admin/paginas/editais/textos/nova-secao/page.tsx":
    adminCanonicalRoutes.editaisCms.textos,
};
