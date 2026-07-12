"use client";

import type { ReactNode } from "react";
import RequireAdminModulo from "@/app/admin/components/RequireAdminModulo";

export default function AdminProcessosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAdminModulo modulo="processos">{children}</RequireAdminModulo>
  );
}
