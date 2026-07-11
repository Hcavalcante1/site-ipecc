"use client";

import type { ReactNode } from "react";
import RequireAdminModulo from "@/app/admin/components/RequireAdminModulo";

export default function AdminEditaisLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAdminModulo modulo="editais">{children}</RequireAdminModulo>
  );
}
