import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/contato");

export default function ContatoLayout({ children }: { children: ReactNode }) {
  return children;
}
