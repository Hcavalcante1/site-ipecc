import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/transparencia");

export default function TransparenciaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
