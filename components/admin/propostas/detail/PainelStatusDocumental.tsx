import { CORES_STATUS_DOCUMENTAL } from "@/lib/documental";
import type { DiagnosticoDocumental } from "@/lib/documental";
import { adminTokens } from "@/components/admin";
import { InfoCard, ListaDiagnostico } from "./propostaDetailUi";

export function PainelStatusDocumental({
  diagnostico,
}: {
  diagnostico: DiagnosticoDocumental;
}) {
  return (
    <InfoCard title="Status documental (sugestão automática)">
      <p
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.base,
          color: adminTokens.colors.text.muted,
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Status sugerido automaticamente. A decisão final cabe ao analista
        responsável.
      </p>
      <div
        style={{
          ...CORES_STATUS_DOCUMENTAL[diagnostico.status],
          borderRadius: 16,
          padding: adminTokens.spacing.lg,
          marginBottom: adminTokens.spacing.lg,
          border: CORES_STATUS_DOCUMENTAL[diagnostico.status].border,
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: adminTokens.spacing.sm,
            opacity: 0.9,
          }}
        >
          Status sugerido
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: adminTokens.typography.fontWeight.bold,
            lineHeight: 1.25,
          }}
        >
          {diagnostico.statusLabel}
        </div>
      </div>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: 15,
          color: adminTokens.colors.text.secondary,
        }}
      >
        Núcleo documental: {diagnostico.nucleoEncontrados}/{diagnostico.nucleoTotal}
      </p>
      <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
        <ListaDiagnostico
          titulo="Documentos do núcleo encontrados"
          itens={diagnostico.listaVerde}
          cor="#86efac"
        />
        <ListaDiagnostico
          titulo="Documentos condicionais ausentes"
          itens={diagnostico.listaLaranja}
          cor="#fbbf24"
        />
        <ListaDiagnostico
          titulo="Pendências graves"
          itens={diagnostico.listaVermelha}
          cor="#fca5a5"
        />
        <ListaDiagnostico
          titulo="Alertas de certidões (cadastro institucional)"
          itens={diagnostico.alertasCertidoes}
          cor="#fdba74"
        />
      </div>
    </InfoCard>
  );
}
