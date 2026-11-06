import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isMestre, podeModuloNaProposta, type AdminContexto } from "@/lib/auth/adminEscopo";

export async function propostaPermitidaNoModulo(
  contexto: AdminContexto,
  propostaId: string
): Promise<boolean> {
  if (isMestre(contexto)) return true;
  const admin = getSupabaseAdmin();
  const { data: proposta } = await admin.from("propostas").select("edital_id").eq("id", propostaId).maybeSingle();
  if (!proposta?.edital_id) return false;
  const { data: edital } = await admin.from("editais").select("processo_id").eq("id", proposta.edital_id).maybeSingle();
  return podeModuloNaProposta(contexto, "propostas", edital?.processo_id, propostaId);
}