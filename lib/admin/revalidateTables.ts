import { revalidatePath } from "next/cache";

const TABLE_PATHS: Record<string, string[]> = {
  noticias: ["/noticias", "/inicio"],
  eventos: ["/eventos", "/inicio"],
  paginas_conteudo: ["/", "/inicio", "/projetos", "/quem-somos", "/contato", "/editais", "/transparencia"],
  paginas_eixos: ["/projetos", "/"],
  editais: ["/editais", "/transparencia"],
  editais_documentos: ["/editais"],
  transparencia_editais: ["/transparencia"],
  transparencia_convenios: ["/transparencia"],
  transparencia_prestacao_contas: ["/transparencia"],
  paginas: ["/contato"],
  certidoes: ["/transparencia"],
  contato_mensagens: ["/contato"],
  proposta_anexos: ["/propostas"],
};

export function revalidateForTable(table: string) {
  for (const path of TABLE_PATHS[table] ?? []) {
    revalidatePath(path);
  }
}
