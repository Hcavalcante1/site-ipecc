"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { adminTokens } from "@/components/admin";
import type { LinhaAuditoriaAnexo, ResumoAuditoriaAnexos } from "@/lib/documental/auditoriaAnexos";

const shellStyle: CSSProperties = {
  padding: adminTokens.spacing.base + adminTokens.spacing.xl,
};

const cardStyle: CSSProperties = {
  background: "#0f172a",
  padding: adminTokens.spacing.base + adminTokens.spacing.sm,
  marginTop: adminTokens.spacing.md,
  borderRadius: 10,
  color: "#fff",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  marginTop: adminTokens.spacing.md,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13,
  color: "#94a3b8",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  fontSize: 13,
  verticalAlign: "top",
};

export default function AuditoriaAnexosPage() {
  const [linhas, setLinhas] = useState<LinhaAuditoriaAnexo[]>([]);
  const [resumo, setResumo] = useState<ResumoAuditoriaAnexos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro("");

      try {
        const res = await fetch("/api/admin/propostas/auditoria-anexos", {
          credentials: "include",
        });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setErro(json.error || "Falha ao carregar auditoria");
          setLinhas([]);
          setResumo(null);
          return;
        }

        setLinhas(json.linhas || []);
        setResumo(json.resumo || null);
      } catch {
        setErro("Erro de rede ao carregar auditoria");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  if (loading) {
    return <p style={{ padding: adminTokens.spacing.xxxl }}>Carregando auditoria…</p>;
  }

  return (
    <div style={shellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: adminTokens.spacing.md,
        }}
      >
        <h1 style={{ margin: 0 }}>Auditoria de anexos (read-only)</h1>
        <Link
          href="/admin/propostas"
          style={{
            color: "#93c5fd",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          ← Voltar às propostas
        </Link>
      </div>

      <p style={{ color: adminTokens.colors.text.muted, marginTop: adminTokens.spacing.md }}>
        Verificacao em tempo real no bucket <strong>propostas</strong>. Esta tela
        apenas confirma se os anexos existem no storage; nao altera banco,
        status ou arquivos.
      </p>

      {erro && (
        <div style={{ ...cardStyle, color: "#f87171" }}>{erro}</div>
      )}

      {resumo && (
        <div style={cardStyle}>
          <p style={{ margin: 0 }}>
            <strong>Propostas:</strong> {resumo.propostas} ·{" "}
            <strong>Referências:</strong> {resumo.referencias} ·{" "}
            <strong>Disponíveis:</strong>{" "}
            <span style={{ color: adminTokens.colors.success.background }}>{resumo.disponiveis}</span> ·{" "}
            <strong>Órfãos:</strong>{" "}
            <span style={{ color: resumo.orfaos ? "#f97316" : adminTokens.colors.success.background }}>
              {resumo.orfaos}
            </span>
          </p>
        </div>
      )}

      <div style={cardStyle}>
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={thStyle}>Proposta</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Coluna</th>
                <th style={thStyle}>Documento</th>
                <th style={thStyle}>Path</th>
                <th style={thStyle}>Storage</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, color: "#94a3b8" }}>
                    Nenhuma referência de anexo encontrada.
                  </td>
                </tr>
              ) : (
                linhas.map((linha, index) => (
                  <tr key={`${linha.proposta_id}-${linha.path}-${index}`}>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/propostas/${linha.proposta_id}`}
                        style={{ color: "#93c5fd" }}
                      >
                        {linha.nome || linha.proposta_id}
                      </Link>
                    </td>
                    <td style={tdStyle}>{linha.email || "—"}</td>
                    <td style={tdStyle}>{linha.coluna_url}</td>
                    <td style={tdStyle}>{linha.label}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                      {linha.path}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: linha.existe ? "#22c55e" : "#f97316",
                        fontWeight: adminTokens.typography.fontWeight.bold,
                      }}
                    >
                      {linha.existe ? "sim" : "não"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
