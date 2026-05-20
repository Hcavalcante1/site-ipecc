import {
  formatarDataCertidao,
  labelCampoCertidao,
  situacaoValidadeCertidao,
} from "@/lib/documental";
import type { CertidaoEntidadeLinha } from "@/lib/documental";
import { adminTokens } from "@/components/admin";
import { InfoCard } from "./propostaDetailUi";

export function RegularidadeFiscalEntidade({
  carregando,
  cnpjDigitos,
  certidoes,
}: {
  carregando: boolean;
  cnpjDigitos: string;
  certidoes: CertidaoEntidadeLinha[];
}) {
  return (
    <InfoCard title="Regularidade fiscal da entidade">
      {carregando ? (
        <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
          Carregando certidões...
        </span>
      ) : cnpjDigitos.length !== 14 ? (
        <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
          CNPJ da proposta inválido ou não informado.
        </span>
      ) : certidoes.length === 0 ? (
        <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
          Nenhuma certidão cadastrada para esta entidade.
        </span>
      ) : (
        <>
          <p
            style={{
              marginTop: 0,
              marginBottom: adminTokens.spacing.base,
              color: adminTokens.colors.text.muted,
              fontSize: 14,
            }}
          >
            CNPJ consultado: {cnpjDigitos}
          </p>
          <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
            {certidoes.map((item) => {
              const validade = situacaoValidadeCertidao(item.validade_ate);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: adminTokens.sizes.input.padding,
                    borderRadius: adminTokens.borderRadius.sm,
                    background: adminTokens.colors.surface.subtle,
                    border: "1px solid rgba(148,163,184,0.10)",
                  }}
                >
                  <strong style={{ color: "#fff", fontSize: 15 }}>
                    {item.tipo_nome}
                  </strong>
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      marginTop: adminTokens.spacing.sm,
                      fontSize: 14,
                      color: adminTokens.colors.text.secondary,
                    }}
                  >
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Órgão emissor:
                      </strong>{" "}
                      {item.orgao_emissor}
                    </span>
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Esfera:
                      </strong>{" "}
                      {labelCampoCertidao(item.esfera)}
                    </span>
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Status:
                      </strong>{" "}
                      {labelCampoCertidao(item.status)}
                    </span>
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Validade:
                      </strong>{" "}
                      {formatarDataCertidao(item.validade_ate)}
                    </span>
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Versão:
                      </strong>{" "}
                      v{item.versao}
                    </span>
                    <span>
                      <strong style={{ color: adminTokens.colors.text.primary }}>
                        Situação:
                      </strong>{" "}
                      <span style={{ color: validade.cor, fontWeight: 600 }}>
                        {validade.texto}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </InfoCard>
  );
}
