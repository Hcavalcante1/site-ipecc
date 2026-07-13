"use client";

import GestaoDocumentalShell, {
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

export default function ShellPlaceholderPage({
  title,
  description,
  fase,
}: {
  title: string;
  description: string;
  fase: string;
}) {
  return (
    <GestaoDocumentalShell title={title} description={description}>
      <div style={gdCardStyle}>
        <p style={{ margin: 0 }}>
          Área preparada na Fase 1. Funcionalidade completa prevista para{" "}
          <strong>{fase}</strong>.
        </p>
      </div>
    </GestaoDocumentalShell>
  );
}
