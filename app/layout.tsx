import "./globals.css";
import type { ReactNode } from "react";
import PublicSiteShell from "@/components/public/PublicSiteShell";
import metadata from "./metadata";

export { metadata };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PublicSiteShell>{children}</PublicSiteShell>
      </body>
    </html>
  );
}
