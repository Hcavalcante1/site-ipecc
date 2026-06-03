import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/editais");

export default function EditaisLayout({ children }: { children: ReactNode }) {
  return children;
}
