import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/projetos");

export default function ProjetosLayout({ children }: { children: ReactNode }) {
  return children;
}
