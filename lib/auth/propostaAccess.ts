import { isMestre, type AdminContexto } from "@/lib/auth/adminEscopo";

/** As inscrições do site principal ficam restritas ao administrador mestre. */
export async function propostaPermitidaNoModulo(
  contexto: AdminContexto,
  _propostaId: string
): Promise<boolean> {
  return isMestre(contexto);
}
