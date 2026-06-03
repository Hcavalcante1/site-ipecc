import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/propostas");

export default function PropostasLayout({ children }: { children: ReactNode }) {
  return children;
}
