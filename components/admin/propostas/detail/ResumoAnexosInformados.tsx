import { adminTokens } from "@/components/admin";
import { InfoCard } from "./propostaDetailUi";

export function ResumoAnexosInformados({
  itens,
}: {
  itens: { chave: string; valor: string }[];
}) {
  return (
    <InfoCard title="Resumo dos Anexos Informados">
      {itens.length === 0 ? (
        <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>—</span>
      ) : (
        <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
          {itens.map((item, index) => (
            <div
              key={`${item.chave}-${index}`}
              style={{
                padding: adminTokens.sizes.input.padding,
                borderRadius: adminTokens.borderRadius.sm,
                background: adminTokens.colors.surface.subtle,
                border: "1px solid rgba(148,163,184,0.10)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: adminTokens.typography.fontWeight.bold,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#93c5fd",
                  marginBottom: 4,
                }}
              >
                {item.chave || "Anexo"}
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: adminTokens.colors.text.secondary,
                  wordBreak: "break-word",
                }}
              >
                {item.valor || "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
}
