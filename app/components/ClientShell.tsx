"use client";

import { ReactNode } from "react";

type ClientShellProps = {
  children: ReactNode;
};

export default function ClientShell({ children }: ClientShellProps) {
  return <>{children}</>;
}