import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Envio de Propostas | IPECC",
  description: "Área de envio de propostas e documentos do IPECC.",
  robots: { index: false, follow: false },
};

export default function PropostasLayout({ children }: { children: ReactNode }) {
  return children;
}
