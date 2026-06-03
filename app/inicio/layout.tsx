import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/inicio");

export default function InicioLayout({ children }: { children: ReactNode }) {
  return children;
}
