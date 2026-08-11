import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://www.ipecc.org.br";

function normalizeUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    const host = parsed.hostname.toLowerCase();

    if (
      host === "ipecc.org.br" ||
      host.endsWith(".ipecc.org.br") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // ignore invalid URLs
  }

  return null;
}

export function getPublicSiteUrl(): string {
  const envUrl =
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (envUrl) return envUrl;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  return isProd ? DEFAULT_SITE_URL : "http://localhost:3000";
}

export const SITE_URL = getPublicSiteUrl();

const ogImage = "/media/seo/og-image.jpg";

export type PublicSeoPage = {
  path: string;
  title: string;
  description: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

export const publicSeoPages: PublicSeoPage[] = [
  {
    path: "/",
    title: "IPECC | Instituto Paulista de Esporte, Cultura e Cidadania",
    description:
      "IPECC: projetos sociais, editais, propostas, transparencia e parcerias institucionais em Sao Paulo.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/inicio",
    title: "Inicio | IPECC",
    description:
      "Conheca os destaques, projetos, eventos e canais do Instituto Paulista de Esporte, Cultura e Cidadania.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/quem-somos",
    title: "Quem Somos | IPECC",
    description:
      "Saiba mais sobre a historia, atuacao, principios e missao institucional do IPECC.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/projetos",
    title: "Projetos | IPECC",
    description:
      "Projetos sociais, culturais, educacionais e parcerias desenvolvidas pelo IPECC.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/eventos",
    title: "Eventos | IPECC",
    description:
      "Agenda publica de eventos, atividades, oficinas e acoes institucionais do IPECC.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/noticias",
    title: "Noticias | IPECC",
    description:
      "Noticias, comunicados e registros das acoes, projetos e iniciativas do IPECC.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/transparencia",
    title: "Transparencia | IPECC",
    description:
      "Documentos institucionais, convenios, prestacao de contas, editais e informacoes publicas do IPECC.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/editais",
    title: "Editais | IPECC",
    description:
      "Editais publicos, chamamentos, documentos de habilitacao, resultados e informacoes de participacao do IPECC.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/contato",
    title: "Contato | IPECC",
    description:
      "Fale com o IPECC, acesse canais institucionais, cotacoes, fornecedores e atendimento ao publico.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/propostas",
    title: "Envio de Propostas | IPECC",
    description:
      "Formulario publico para envio de propostas comerciais e documentos de habilitacao ao IPECC.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
];

export const extraSeoPages: PublicSeoPage[] = [
  {
    path: "/acoes",
    title: "Acoes | IPECC",
    description: "Acoes e iniciativas publicas realizadas pelo IPECC.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/projetos/oficinas-educacao-cidada",
    title: "Oficinas de Educacao Cidada | IPECC",
    description: "Projeto de oficinas de educacao cidada do IPECC.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/projetos/cultura-inclusao-social",
    title: "Cultura e Inclusao Social | IPECC",
    description: "Projeto de cultura e inclusao social do IPECC.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/projetos/parcerias-institucionais",
    title: "Parcerias Institucionais | IPECC",
    description: "Parcerias institucionais e iniciativas colaborativas do IPECC.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/projetos/valer-mais",
    title: "Valer Mais | IPECC",
    description: "Projeto Valer Mais desenvolvido pelo IPECC.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function publicMetadata(path: string): Metadata {
  const page =
    [...publicSeoPages, ...extraSeoPages].find((item) => item.path === path) ||
    publicSeoPages[0];
  const url = absoluteUrl(page.path);

  return {
    metadataBase: new URL(SITE_URL),
    title: page.title,
    description: page.description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "IPECC",
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "IPECC - Instituto Paulista de Esporte, Cultura e Cidadania",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [ogImage],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IPECC - Instituto Paulista de Esporte, Cultura e Cidadania",
    alternateName: "IPECC",
    url: SITE_URL,
    logo: absoluteUrl("/media/global/logos/ipecc_logo_v2.png"),
    sameAs: [
      "https://www.instagram.com/ipecc",
      "https://www.facebook.com/ipecc",
      "https://www.linkedin.com/company/ipecc",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "Atendimento institucional",
        telephone: "+55-11-94331-2119",
        areaServed: "BR",
        availableLanguage: "Portuguese",
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IPECC",
    url: SITE_URL,
    inLanguage: "pt-BR",
  };
}

export function breadcrumbJsonLd(pathname: string) {
  const cleanPath = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const current =
    [...publicSeoPages, ...extraSeoPages].find((item) => item.path === cleanPath) ||
    null;

  if (!current || current.path === "/") {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Portal",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: current.title.replace(" | IPECC", ""),
        item: absoluteUrl(current.path),
      },
    ],
  };
}
