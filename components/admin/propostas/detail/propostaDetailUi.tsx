import type { CSSProperties, ReactNode } from "react";
import { adminTokens } from "@/components/admin";

export const gap20 = adminTokens.spacing.base + adminTokens.spacing.sm;

export function btn(bg: string, color: string): CSSProperties {
  return {
    background: bg,
    color,
    padding: adminTokens.sizes.button.medium.padding,
    borderRadius: adminTokens.sizes.button.medium.borderRadius,
    textDecoration: "none",
    fontWeight: adminTokens.typography.fontWeight.bold,
    fontSize: adminTokens.sizes.button.medium.fontSize,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    lineHeight: adminTokens.typography.lineHeight.normal,
  };
}

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        borderRadius: adminTokens.borderRadius.md,
        padding: adminTokens.sizes.card.mainPadding,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.sm * 2,
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function LabelValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.55,
        color: adminTokens.colors.text.secondary,
      }}
    >
      <strong
        style={{
          color: adminTokens.colors.text.primary,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </strong>{" "}
      {value}
    </p>
  );
}

export function BadgeCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue";
}) {
  const palette =
    tone === "green"
      ? {
          bg: "rgba(34,197,94,0.10)",
          border: "1px solid rgba(34,197,94,0.22)",
          label: "#86efac",
        }
      : {
          bg: "rgba(59,130,246,0.10)",
          border: "1px solid rgba(59,130,246,0.22)",
          label: "#93c5fd",
        };

  return (
    <div
      style={{
        background: palette.bg,
        border: palette.border,
        borderRadius: 16,
        padding: adminTokens.spacing.lg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: palette.label,
          marginBottom: adminTokens.spacing.sm,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function ListaDiagnostico({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: string;
}) {
  if (itens.length === 0) return null;

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: cor,
        }}
      >
        {titulo}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: cor, lineHeight: 1.5 }}>
        {itens.map((item) => (
          <li key={item} style={{ marginBottom: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
