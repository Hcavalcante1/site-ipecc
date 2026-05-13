/**
 * Admin Design Tokens
 * Tokens visuais compartilhados para toda a interface admin
 * Utilizáveis em todos os módulos sem necessidade de duplicação de estilos
 */

// ============================================================================
// ESPAÇAMENTOS (Spacing)
// ============================================================================
export const spacing = {
  xs: 6,      // muito compacto
  sm: 8,      // pequeno
  md: 10,     // médio pequeno
  base: 12,   // padrão
  lg: 14,     // médio grande
  xl: 18,     // grande
  xxl: 22,    // muito grande
  xxxl: 24,   // máximo comum
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const borderRadius = {
  sm: 12,     // campos de input/buttons
  md: 18,     // cards pequenos
  lg: 22,     // cards principais
  full: 999,  // botões/badges completamente arredondados
} as const;

// ============================================================================
// SOMBRAS (Shadows)
// ============================================================================
export const shadows = {
  card: "0 14px 34px rgba(0,0,0,0.30)",           // shadow principal de cards
  buttonGreen: "0 8px 24px rgba(34,197,94,0.18)", // shadow botão verde
  buttonRed: "0 8px 24px rgba(239,68,68,0.22)",   // shadow botão vermelho
  inset: "0 0 0 1px rgba(34,197,94,0.10) inset",  // shadow inset para select
} as const;

// ============================================================================
// CORES PRINCIPAIS
// ============================================================================
export const colors = {
  // Backgrounds
  background: {
    dark: "#091240",                           // fundo mais escuro
    darker: "#061f3f",                         // fundo ainda mais escuro
    darkest: "#0b1220",                        // fundo mais escuro possível
    gradient: "linear-gradient(135deg, rgba(9,18,40,0.96), rgba(6,23,63,0.92))", // gradient principal
  },
  
  // Foregroun/Texto
  text: {
    primary: "#f8fafc",   // texto principal branco
    secondary: "#e2e8f0", // texto secundário
    muted: "#cbd5e1",     // texto desabilitado/muted
    light: "#e5e7eb",     // texto mais claro
  },
  
  // Borders
  border: {
    light: "rgba(255,255,255,0.08)",  // border sutil
    medium: "rgba(255,255,255,0.10)", // border normal
    strong: "rgba(255,255,255,0.12)", // border mais forte
  },
  
  // Backgrounds semitransparentes
  surface: {
    subtle: "rgba(255,255,255,0.03)",   // muito sutil
    light: "rgba(255,255,255,0.05)",    // leve
    medium: "rgba(255,255,255,0.06)",   // médio
  },
  
  // Cores de estado
  success: {
    background: "#22c55e",
    text: "#052814",
    light: "#86efac",
    border: "rgba(34,197,94,0.28)",
    bgLight: "rgba(34,197,94,0.14)",
  },
  
  error: {
    background: "#ef4444",
    text: "#fff",
    border: "rgba(239,68,68,0.22)",
  },
  
  // Cores para backgrounds específicos
  bgLight: "rgba(255,255,255,0.06)",
} as const;

// ============================================================================
// TIPOGRAFIA
// ============================================================================
export const typography = {
  // Tamanhos de fonte
  fontSize: {
    xs: "0.84rem",  // badges, pequeno texto
    sm: "0.92rem",  // texto pequeno
    base: "0.93rem", // labels, texto padrão
    md: "0.95rem",  // inputs, texto médio
    lg: "1.15rem",  // títulos de card
    xl: "1.7rem",   // títulos de seção
    xxl: "2rem",    // títulos principais
  },
  
  // Pesos de fonte
  fontWeight: {
    normal: 400,
    bold: 700,
    extrabold: 800,
  },
  
  // Line height
  lineHeight: {
    tight: 1.1,
    normal: 1.2,
    relaxed: 1.6,
  },
} as const;

// ============================================================================
// TAMANHOS DE COMPONENTES
// ============================================================================
export const sizes = {
  // Altura de inputs/campos/selects
  input: {
    height: 44,
    fontSize: "0.95rem",
    padding: "10px 12px",
  },
  
  // Altura de textareas
  textarea: {
    minHeight: 96,
    fontSize: "0.95rem",
    padding: "10px 12px",
  },
  
  // Tamanhos de botão
  button: {
    small: {
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 700,
      borderRadius: 999,
    },
    medium: {
      padding: "10px 18px",
      fontSize: 14,
      fontWeight: 700,
      borderRadius: 999,
    },
  },
  
  // Tamanhos de card
  card: {
    mainPadding: 22,
    mainBorderRadius: 22,
    smallPadding: 18,
    smallBorderRadius: 18,
  },
  
  // Grid
  grid: {
    columns2: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
} as const;

// ============================================================================
// PRÉ-SETS DE ESTILOS COMUNS (React.CSSProperties)
// ============================================================================
export const presets = {
  // Containers
  pageContainer: {
    display: "grid",
    gap: spacing.xxxl,
  } as React.CSSProperties,
  
  sectionCard: {
    background: colors.background.gradient,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    boxShadow: shadows.card,
  } as React.CSSProperties,
  
  recordCard: {
    marginTop: spacing.lg,
    background: colors.surface.subtle,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
  } as React.CSSProperties,
  
  // Títulos
  titleH1: {
    margin: 0,
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text.primary,
  } as React.CSSProperties,
  
  titleH2: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text.primary,
  } as React.CSSProperties,
  
  sectionTitle: {
    margin: 0,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text.primary,
  } as React.CSSProperties,
  
  // Texto
  textPrimary: {
    marginTop: spacing.md,
    color: colors.text.muted,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
  } as React.CSSProperties,
  
  textSecondary: {
    marginTop: spacing.md,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
  } as React.CSSProperties,
  
  // Labels
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  } as React.CSSProperties,
  
  // Inputs
  input: {
    width: "100%",
    minHeight: sizes.input.height,
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.border.strong}`,
    background: colors.surface.light,
    color: colors.text.primary,
    padding: sizes.input.padding,
    outline: "none",
    fontSize: sizes.input.fontSize,
  } as React.CSSProperties,
  
  select: {
    width: "100%",
    minHeight: sizes.input.height,
    borderRadius: borderRadius.sm,
    border: `1px solid rgba(34,197,94,0.38)`,
    background: colors.background.darkest,
    color: colors.text.primary,
    padding: sizes.input.padding,
    outline: "none",
    fontSize: sizes.input.fontSize,
    cursor: "pointer",
    appearance: "auto",
    boxShadow: shadows.inset,
  } as React.CSSProperties,
  
  textarea: {
    width: "100%",
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.border.strong}`,
    background: colors.surface.light,
    color: colors.text.primary,
    padding: sizes.textarea.padding,
    outline: "none",
    fontSize: sizes.textarea.fontSize,
    resize: "vertical",
    minHeight: sizes.textarea.minHeight,
  } as React.CSSProperties,
  
  // Buttons
  buttonGreen: {
    background: colors.success.background,
    color: colors.success.text,
    padding: `${sizes.button.medium.padding}`,
    borderRadius: sizes.button.medium.borderRadius,
    border: "none",
    cursor: "pointer",
    fontWeight: typography.fontWeight.bold,
    fontSize: sizes.button.medium.fontSize,
    lineHeight: typography.lineHeight.normal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.buttonGreen,
  } as React.CSSProperties,
  
  buttonRed: {
    background: colors.error.background,
    color: colors.error.text,
    padding: sizes.button.medium.padding,
    borderRadius: sizes.button.medium.borderRadius,
    border: "none",
    cursor: "pointer",
    fontWeight: typography.fontWeight.bold,
    fontSize: sizes.button.medium.fontSize,
    lineHeight: typography.lineHeight.normal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.buttonRed,
  } as React.CSSProperties,
  
  // Badges
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderRadius: borderRadius.full,
    background: colors.success.bgLight,
    color: colors.success.light,
    border: `1px solid ${colors.success.border}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  } as React.CSSProperties,
  
  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderRadius: borderRadius.full,
    background: colors.bgLight,
    color: colors.text.muted,
    border: `1px solid ${colors.border.medium}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  } as React.CSSProperties,
  
  // Layouts
  toolbar: {
    display: "flex",
    gap: spacing.md,
    flexWrap: "wrap",
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  } as React.CSSProperties,
  
  fieldWrap: {
    display: "grid",
    gap: spacing.xs,
  } as React.CSSProperties,
  
  grid2Columns: {
    display: "grid",
    gridTemplateColumns: sizes.grid.columns2,
    gap: sizes.grid.gap,
  } as React.CSSProperties,
  
  fullWidth: {
    gridColumn: "1 / -1",
  } as React.CSSProperties,
  
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  } as React.CSSProperties,
  
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
    marginTop: spacing.lg,
    paddingTop: spacing.base,
    borderTop: `1px solid ${colors.border.light}`,
  } as React.CSSProperties,
  
  // Mensagens
  message: {
    marginTop: spacing.md,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
  } as React.CSSProperties,
  
  blockMessage: {
    marginTop: spacing.base,
    padding: `${spacing.md}px ${spacing.base}px`,
    borderRadius: borderRadius.sm,
    background: colors.surface.medium,
    border: `1px solid ${colors.border.light}`,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  } as React.CSSProperties,
} as const;

export default {
  spacing,
  borderRadius,
  shadows,
  colors,
  typography,
  sizes,
  presets,
};
