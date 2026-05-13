// app/admin/paginas/page.tsx

import type { CSSProperties } from "react";
import {
  spacing,
  borderRadius,
  typography,
  colors,
  shadows,
  presets,
} from "@/components/admin";

const boxStyle: CSSProperties = {
  borderRadius: borderRadius.md,
  padding: `${spacing.lg}px ${spacing.xl}px ${spacing.xl}px`,
  background: colors.background.gradient,
  border: `1px solid ${colors.border.medium}`,
  boxShadow: shadows.card,
};

const h1Style: CSSProperties = {
  margin: `0 0 ${spacing.xs}px`,
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.extrabold,
  color: colors.text.primary,
};

const subtitleStyle: CSSProperties = {
  margin: `0 0 ${spacing.md}px`,
  fontSize: typography.fontSize.sm,
  color: colors.text.muted,
};

const h2Style: CSSProperties = {
  margin: `${spacing.xl}px 0 ${spacing.sm}px`,
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.bold,
  color: colors.text.primary,
};

const h2SpacedStyle: CSSProperties = {
  ...h2Style,
  marginTop: spacing.xxl,
};

const gridStyle: CSSProperties = {
  marginTop: spacing.sm,
};

const cardStyle: CSSProperties = {
  padding: `${spacing.base}px ${spacing.lg}px`,
  borderRadius: borderRadius.md,
  background: colors.background.gradient,
  border: `1px solid ${colors.border.strong}`,
  boxShadow: shadows.card,
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.bold,
  color: colors.text.primary,
};

const cardButtonStyle: CSSProperties = {
  ...presets.buttonGreen,
  alignSelf: "flex-start",
  marginTop: spacing.xs,
};

export default function AdminPaginas() {
  return (
    <div className="admin-box" style={boxStyle}>
      <h1 className="admin-h1" style={h1Style}>
        Páginas do Site
      </h1>
      <p className="admin-subtitle" style={subtitleStyle}>
        Escolha qual conteúdo você deseja editar: blocos da página inicial (Início) ou páginas internas.
      </p>

      <h2 className="admin-h2" style={h2Style}>
        Início (Página inicial)
      </h2>

      <div className="admin-grid" style={gridStyle}>
        <Card titulo="Hero (Tarja azul degradê)" rota="/admin/paginas/hero" />
        <Card titulo="Cards Principais" rota="/admin/paginas/cards" />
        <Card titulo="Destaques da Semana" rota="/admin/paginas/destaques" />
        <Card titulo="Números" rota="/admin/paginas/numeros" />
        <Card titulo="Impacto Social" rota="/admin/paginas/impacto" />
        <Card titulo="Depoimentos" rota="/admin/paginas/depoimentos" />
        <Card titulo="Sobre + CTA Final" rota="/admin/paginas/sobre-cta" />
      </div>

      <h2 className="admin-h2 spaced" style={h2SpacedStyle}>
        Páginas internas
      </h2>

      <div className="admin-grid" style={gridStyle}>
        <Card titulo="Quem Somos" rota="/admin/paginas/quem-somos" />
        <Card titulo="Projetos" rota="/admin/paginas/projetos" />
        <Card titulo="Transparência" rota="/admin/paginas/transparencia" />
        <Card titulo="Contato" rota="/admin/paginas/contato" />
        <Card titulo="Editais" rota="/admin/paginas/editais" />
      </div>
    </div>
  );
}

function Card({ titulo, rota }: { titulo: string; rota: string }) {
  return (
    <a href={rota} className="admin-card" style={cardStyle}>
      <h3 style={cardTitleStyle}>{titulo}</h3>
      <button className="admin-button" style={cardButtonStyle}>
        Editar
      </button>
    </a>
  );
}
