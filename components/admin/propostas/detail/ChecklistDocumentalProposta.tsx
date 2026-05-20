import {
  COLUNA_URL_POR_CHAVE,
  montarChecklistDocumental,
} from "@/lib/documental";
import { adminTokens } from "@/components/admin";
import { btn, InfoCard } from "./propostaDetailUi";

export function ChecklistDocumentalProposta({
  checklist,
  totalItens,
  proposta,
  url,
}: {
  checklist: ReturnType<typeof montarChecklistDocumental>;
  totalItens: number;
  proposta: Record<string, unknown> | null;
  url: (caminho: string | null) => string | null;
}) {
  return (
    <InfoCard title="Checklist documental da proposta">
      <p
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.base,
          color: adminTokens.colors.text.muted,
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Checklist gerado a partir dos anexos informados no envio da proposta.
      </p>
      {totalItens === 0 ? (
        <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
          Nenhum anexo identificado na mensagem ou nas colunas da proposta.
        </span>
      ) : (
        <div style={{ display: "grid", gap: adminTokens.spacing.lg }}>
          {checklist.map((grupo) =>
            grupo.itens.length === 0 ? null : (
              <div key={grupo.id} style={{ marginBottom: adminTokens.spacing.lg }}>
                <h4
                  style={{
                    margin: "0 0 10px",
                    fontSize: 15,
                    fontWeight: adminTokens.typography.fontWeight.bold,
                    color: "#93c5fd",
                  }}
                >
                  {grupo.titulo}
                </h4>
                <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
                  {grupo.itens.map((item) => {
                    const href = item.path ? url(item.path) : null;
                    const coluna = COLUNA_URL_POR_CHAVE[item.key];
                    const temColuna =
                      !!coluna &&
                      typeof proposta?.[coluna] === "string" &&
                      !!(proposta[coluna] as string).trim();

                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: adminTokens.sizes.input.padding,
                          borderRadius: adminTokens.borderRadius.sm,
                          background: adminTokens.colors.surface.subtle,
                          border: "1px solid rgba(148,163,184,0.10)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: adminTokens.typography.fontWeight.bold,
                            color: "#ffffff",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: adminTokens.colors.text.muted,
                            wordBreak: "break-word",
                          }}
                        >
                          {item.path ? (
                            <>
                              <span style={{ display: "block", marginBottom: 6 }}>
                                Arquivo: {item.path}
                              </span>
                              {href && temColuna ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    ...btn("#22c55e", "#052e16"),
                                    fontSize: 13,
                                    padding: "6px 12px",
                                  }}
                                >
                                  Baixar documento
                                </a>
                              ) : (
                                <span>
                                  Registrado na mensagem do envio (sem coluna
                                  dedicada para download automático).
                                </span>
                              )}
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </InfoCard>
  );
}
