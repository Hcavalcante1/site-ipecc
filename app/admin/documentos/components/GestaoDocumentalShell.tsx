"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { adminTokens } from "@/components/admin";
import { NAV_GESTAO_DOCUMENTAL } from "@/lib/documentos/labels";

const shellStyle: CSSProperties = {
  maxWidth: 1100,
  color: "#e5e7eb",
};

const subnavStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: adminTokens.spacing.base,
  marginBottom: adminTokens.spacing.base + adminTokens.spacing.sm,
};

const chipStyle = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 999,
  border: `1px solid ${active ? "#3b82f6" : "#334155"}`,
  background: active
    ? "linear-gradient(180deg, rgba(37,99,235,0.34), rgba(37,99,235,0.16))"
    : "rgba(255,255,255,0.04)",
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  minHeight: 46,
  minWidth: 132,
  flex: "1 1 132px",
  boxShadow: active ? "0 8px 18px rgba(37,99,235,0.20)" : "none",
  transition: "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
});

export default function GestaoDocumentalShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={shellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="admin-h1">{title}</h1>
          {description ? (
            <p style={{ marginTop: 8, maxWidth: 720, opacity: 0.9 }}>
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>

      <nav style={subnavStyle} aria-label="Navegação Gestão Documental">
        {NAV_GESTAO_DOCUMENTAL.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={chipStyle(
              pathname === item.href || pathname.startsWith(item.href + "/")
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

export const gdCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid #334155",
  borderRadius: adminTokens.borderRadius.md,
  padding: adminTokens.spacing.base + adminTokens.spacing.sm,
  marginTop: adminTokens.spacing.base,
};

export const gdBtnStyle: CSSProperties = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  borderRadius: adminTokens.borderRadius.full,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  background: "#1e40af",
  color: "#fff",
  textDecoration: "none",
  display: "inline-block",
};

export const gdInputStyle: CSSProperties = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  borderRadius: adminTokens.borderRadius.sm,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e5e7eb",
  width: "100%",
  maxWidth: 480,
};
