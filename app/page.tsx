import type { Metadata } from "next";
import ApresentacaoLanding from "@/components/public/ApresentacaoLanding";
import { LANDING_CHAMADA } from "@/lib/landing/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `IPECC | ${LANDING_CHAMADA} — Projetos e Parcerias em São Paulo`,
  description:
    "Instituto IPECC: educação, esporte, cultura e cidadania em São Paulo. Editais, propostas com checklist documental e transparência ativa.",
  keywords: [
    "IPECC",
    "instituto educação esporte cultura cidadania",
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
        alt: `IPECC — ${LANDING_CHAMADA}`,
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
