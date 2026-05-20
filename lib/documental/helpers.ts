import { LABEL_INSTITUCIONAL_POR_CHAVE } from "./labels";

export function labelInstitucionalDocumento(chave: string) {
  if (LABEL_INSTITUCIONAL_POR_CHAVE[chave]) {
    return LABEL_INSTITUCIONAL_POR_CHAVE[chave];
  }
  return chave.replace(/_/g, " ");
}
