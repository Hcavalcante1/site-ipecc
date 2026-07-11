"use client";

import type { ReactNode } from "react";
import RequireAdminModulo from "@/app/admin/components/RequireAdminModulo";

/** Bloqueia CMS do site (hero, CTA, LGPD, etc.) para login so de processo. */
export default function AdminPaginasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAdminModulo>{children}</RequireAdminModulo>;
}
