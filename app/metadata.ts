import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ipecc.org.br"),
  title: {
    default: "IPECC | Instituto Paulista de Esporte, Cultura e Cidadania",
    template: "%s | IPECC",
  },
  description:
    "Instituto Paulista de Esporte, Cultura e Cidadania. Projetos sociais, transparência, editais, cultura, educação e cidadania.",
  keywords: [
    "IPECC",
    "instituto",
    "educação",
    "cultura",
    "cidadania",
    "transparência",
    "editais",
    "projetos sociais",
    "OSC",
    "Suzano",
    "São Paulo",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "IPECC",
    description:
      "Instituto Paulista de Esporte, Cultura e Cidadania",
    url: "https://www.ipecc.org.br",
    siteName: "IPECC",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/media/seo/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "IPECC",
      },
    ],
  },
};

export default metadata;