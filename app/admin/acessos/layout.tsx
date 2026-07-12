"use client";

import type { ReactNode } from "react";
import RequireAdminModulo from "@/app/admin/components/RequireAdminModulo";

export default function AdminAcessosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAdminModulo modulo="acessos">{children}</RequireAdminModulo>
  );
}
