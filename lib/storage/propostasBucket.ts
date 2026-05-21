import { candidatosPathProposta } from "@/lib/documental/propostaPaths";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "propostas";

export async function existeArquivoProposta(filePath: string) {
  for (const candidato of candidatosPathProposta(filePath)) {
    const { data } = await supabaseAdmin.storage.from(BUCKET).download(candidato);
    if (data) {
      return { exists: true as const, resolvedPath: candidato };
    }
  }
  return { exists: false as const };
}

export async function downloadArquivoProposta(filePath: string) {
  let ultimoErro: string | null = null;

  for (const candidato of candidatosPathProposta(filePath)) {
    const res = await supabaseAdmin.storage.from(BUCKET).download(candidato);
    if (res.data) {
      return { data: res.data, pathUsado: candidato };
    }
    ultimoErro = res.error?.message || JSON.stringify(res.error) || null;
  }

  return { error: ultimoErro || "Arquivo não encontrado no storage" };
}
