import type { Metadata } from "next";
import { headers } from "next/headers";
import { obterValidacaoPublica } from "@/lib/documentos/signing/validationService";

export const dynamic = "force-dynamic";

type Props = { params: { codigo: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Validar assinatura ${params.codigo} | IPECC`,
    robots: { index: false, follow: false },
  };
}

export default async function ValidarAssinaturaPage({ params }: Props) {
  const h = headers();
  const resultado = await obterValidacaoPublica({
    codigo: params.codigo,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f766e22 100%)",
        color: "#e2e8f0",
        fontFamily:
          "Segoe UI, system-ui, -apple-system, sans-serif",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "rgba(15,23,42,0.92)",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, letterSpacing: 1 }}>
          IPECC · Validação de assinatura eletrônica
        </p>
        <h1 style={{ marginTop: 8, marginBottom: 8, fontSize: 28 }}>
          Verificar documento
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 0 }}>
          Código: <strong style={{ color: "#f8fafc" }}>{params.codigo}</strong>
        </p>

        {!resultado.encontrado ? (
          <p
            style={{
              background: "#7f1d1d55",
              border: "1px solid #b91c1c",
              borderRadius: 10,
              padding: 14,
            }}
          >
            Nenhuma evidência encontrada para este código.
          </p>
        ) : (
          <>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: "10px 16px",
                fontSize: 15,
              }}
            >
              <dt style={{ color: "#94a3b8" }}>Documento</dt>
              <dd style={{ margin: 0 }}>
                {resultado.documento?.title || "—"}
                {resultado.documento
                  ? ` (versão ${resultado.documento.current_version})`
                  : ""}
              </dd>
              <dt style={{ color: "#94a3b8" }}>Signatário</dt>
              <dd style={{ margin: 0 }}>
                {resultado.evidencia?.nome}
                {resultado.evidencia?.cargo
                  ? ` · ${resultado.evidencia.cargo}`
                  : ""}
              </dd>
              <dt style={{ color: "#94a3b8" }}>E-mail</dt>
              <dd style={{ margin: 0 }}>{resultado.evidencia?.email}</dd>
              <dt style={{ color: "#94a3b8" }}>Assinado em</dt>
              <dd style={{ margin: 0 }}>
                {resultado.evidencia?.signed_at
                  ? new Date(resultado.evidencia.signed_at).toLocaleString(
                      "pt-BR"
                    )
                  : "—"}{" "}
                ({resultado.evidencia?.timezone})
              </dd>
              <dt style={{ color: "#94a3b8" }}>Nº assinatura</dt>
              <dd style={{ margin: 0 }}>
                {resultado.evidencia?.signature_serial}
              </dd>
              <dt style={{ color: "#94a3b8" }}>Hash original</dt>
              <dd
                style={{
                  margin: 0,
                  wordBreak: "break-all",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                }}
              >
                {resultado.evidencia?.document_hash_sha256}
              </dd>
              <dt style={{ color: "#94a3b8" }}>Hash assinado</dt>
              <dd
                style={{
                  margin: 0,
                  wordBreak: "break-all",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                }}
              >
                {resultado.evidencia?.signed_hash_sha256}
              </dd>
              <dt style={{ color: "#94a3b8" }}>Integridade</dt>
              <dd style={{ margin: 0 }}>
                <span
                  style={{
                    color: resultado.integridade?.ok ? "#6ee7b7" : "#fca5a5",
                    fontWeight: 600,
                  }}
                >
                  {resultado.integridade?.ok ? "Íntegro" : "Divergente/indisponível"}
                </span>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                  {resultado.integridade?.detalhe}
                </div>
              </dd>
            </dl>

            {resultado.downloadUrl ? (
              <p style={{ marginTop: 24 }}>
                <a
                  href={resultado.downloadUrl}
                  style={{
                    display: "inline-block",
                    background: "#0f766e",
                    color: "#fff",
                    textDecoration: "none",
                    padding: "10px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Baixar PDF assinado
                </a>
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
