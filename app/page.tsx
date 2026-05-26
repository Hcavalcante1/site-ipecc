import type { Metadata } from "next";
import ApresentacaoLanding from "@/components/public/ApresentacaoLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "IPECC | Educação, Cultura e Cidadania — Projetos e Parcerias em São Paulo",
  description:
    "Instituto IPECC: projetos sociais, editais abertos, envio de propostas com checklist documental e transparência ativa. Valer Mais, oficinas de cidadania e parcerias no Estado de São Paulo.",
  keywords: [
    "IPECC",
    "instituto educação cultura cidadania",
    "projetos sociais São Paulo",
    "editais OSC",
    "envio de propostas",
    "transparência institucional",
    "parcerias públicas",
    "Valer Mais",
    "oficinas educação cidadã",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "IPECC — Impacto social em São Paulo",
    description:
      "Parcerias, editais e projetos de educação, cultura e cidadania. Conheça o IPECC.",
    url: "/",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/media/seo/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "IPECC — Educação, Cultura e Cidadania",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <ApresentacaoLanding />;
}
