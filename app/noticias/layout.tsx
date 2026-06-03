import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/noticias");

export default function NoticiasLayout({ children }: { children: ReactNode }) {
  return children;
}
