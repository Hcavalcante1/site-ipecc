"use client";

import type { ReactNode } from "react";
import RequireAdminModulo from "@/app/admin/components/RequireAdminModulo";

export default function AdminPropostasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAdminModulo modulo="propostas">{children}</RequireAdminModulo>
  );
}
