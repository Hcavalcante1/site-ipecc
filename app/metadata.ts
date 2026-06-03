import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata("/"),
  title: {
    default: "IPECC | Instituto Paulista de Esporte, Cultura e Cidadania",
    template: "%s | IPECC",
  },
  description:
    "IPECC — projetos sociais, editais, propostas e transparência em São Paulo. Educação, cultura e cidadania com impacto mensurável.",
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
};

export default metadata;
