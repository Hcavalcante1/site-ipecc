import type { Metadata } from "next";
import ApresentacaoLanding from "@/components/public/ApresentacaoLanding";
import { LANDING_CHAMADA } from "@/lib/landing/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Portal IPECC | ${LANDING_CHAMADA}`,
  description:
    "Portal do Instituto IPECC: educacao, esporte, cultura, cidadania, editais, propostas, projetos e transparencia institucional.",
  alternates: {
    canonical: "/portal",
  },
  openGraph: {
    title: "Portal IPECC",
    description:
      "Conheca o portal do IPECC, com projetos sociais, editais, propostas, transparencia e canais institucionais.",
    url: "/portal",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/media/seo/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `Portal IPECC - ${LANDING_CHAMADA}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Portal IPECC | ${LANDING_CHAMADA}`,
    description:
      "Portal publico do IPECC com projetos, editais, propostas e transparencia institucional.",
    images: ["/media/seo/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PortalPage() {
  return <ApresentacaoLanding />;
}
