import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  editalAceitaEnvioProposta,
  getMensagemEnvioPropostaInstitucional,
} from "@/lib/editais/governancaRules";

const COLUNAS_URL_ANEXOS = [
  "cnpj_url",
  "contrato_social_url",
  "estatuto_url",
  "ata_posse_url",
  "doc_pessoal_url",
  "doc_representante_url",
  "procuracao_url",
  "certidao_federal_url",
  "certidao_estadual_url",
  "certidao_municipal_url",
  "fgts_url",
  "cndt_url",
  "atestado_tecnico_url",
  "qualificacao_tecnica_url",
  "equipe_tecnica_url",
  "portfolio_url",
  "formacao_url",
  "registro_profissional_url",
  "comprovante_residencia_url",
  "cpf_url",
] as const;

const CAMPOS_PROPOSTA_PERMITIDOS = new Set([
  "nome",
  "cnpj",
  "email",
  "telefone",
  "mensagem",
  "tipo",
  "categoria",
  "arquivo_url",
  "edital_id",
  ...COLUNAS_URL_ANEXOS,
]);

export type ResultadoEnvioProposta =
  | { ok: true; propostaId: string }
  | { ok: false; status: number; error: string };

function sanitizarPayloadProposta(body: Record<string, unknown>) {
  const limpo: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(body)) {
    if (!CAMPOS_PROPOSTA_PERMITIDOS.has(chave)) continue;
    if (valor === undefined || valor === null) continue;
    if (typeof valor === "string" && !valor.trim()) continue;
    limpo[chave] = typeof valor === "string" ? valor.trim() : valor;
  }

  return limpo;
}

export async function enviarPropostaPublica(
  body: Record<string, unknown>
): Promise<ResultadoEnvioProposta> {
  const payload = sanitizarPayloadProposta(body);

  const nome = String(payload.nome || "");
  const cnpj = String(payload.cnpj || "");
  const email = String(payload.email || "");
  const editalId = String(payload.edital_id || "");
  const arquivoUrl = String(payload.arquivo_url || "");

  if (!nome || !cnpj || !email) {
    return { ok: false, status: 400, error: "Preencha nome, documento e e-mail." };
  }

  if (!editalId) {
    return {
      ok: false,
      status: 400,
      error: "Selecione o edital ou chamamento vinculado antes de enviar.",
    };
  }

  if (!arquivoUrl) {
    return {
      ok: false,
      status: 400,
      error: "Envie o formulario de inscricao / proposta principal (PDF).",
    };
  }

  const { data: edital, error: editalError } = await supabaseAdmin
    .from("editais")
    .select("id, status, fase_atual")
    .eq("id", editalId)
    .maybeSingle();

  if (editalError) {
    return { ok: false, status: 500, error: editalError.message };
  }

  if (!edital) {
    return { ok: false, status: 404, error: "Edital nao encontrado." };
  }

  if (!editalAceitaEnvioProposta(edital)) {
    return {
      ok: false,
      status: 409,
      error: getMensagemEnvioPropostaInstitucional(edital).texto,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("propostas")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, propostaId: String(data.id) };
}

export async function contarPropostasAprovadasEdital(editalId: string) {
  const { count, error } = await supabaseAdmin
    .from("propostas")
    .select("id", { count: "exact", head: true })
    .eq("edital_id", editalId)
    .eq("status", "aprovado");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

