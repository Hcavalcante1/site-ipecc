import type { AnexoUrlPropostaKey } from "@/lib/documental/propostaPaths";

export const DOWNLOAD_VISUAL_POR_COLUNA: Record<
  AnexoUrlPropostaKey,
  { bg: string; color: string }
> = {
  arquivo_url: { bg: "#22c55e", color: "#022c22" },
  cnpj_url: { bg: "#3b82f6", color: "#fff" },
  contrato_social_url: { bg: "#a855f7", color: "#fff" },
  estatuto_url: { bg: "#eab308", color: "#111827" },
  ata_posse_url: { bg: "#8b5cf6", color: "#fff" },
  doc_pessoal_url: { bg: "#f97316", color: "#fff" },
  doc_representante_url: { bg: "#06b6d4", color: "#06283D" },
  procuracao_url: { bg: "#14b8a6", color: "#052e2b" },
  certidao_federal_url: { bg: "#2563eb", color: "#fff" },
  certidao_estadual_url: { bg: "#4f46e5", color: "#fff" },
  certidao_municipal_url: { bg: "#7c3aed", color: "#fff" },
  fgts_url: { bg: "#16a34a", color: "#fff" },
  cndt_url: { bg: "#dc2626", color: "#fff" },
  atestado_tecnico_url: { bg: "#0891b2", color: "#fff" },
  qualificacao_tecnica_url: { bg: "#0f766e", color: "#fff" },
  equipe_tecnica_url: { bg: "#1d4ed8", color: "#fff" },
  portfolio_url: { bg: "#9333ea", color: "#fff" },
  formacao_url: { bg: "#ea580c", color: "#fff" },
  registro_profissional_url: { bg: "#475569", color: "#fff" },
  comprovante_residencia_url: { bg: "#0ea5e9", color: "#fff" },
  cpf_url: { bg: "#64748b", color: "#fff" },
};
