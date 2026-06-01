import { revalidatePath } from "next/cache";

const SLUG_PATHS: Record<string, string[]> = {
  home: ["/", "/inicio"],
  projetos: ["/projetos"],
  "quem-somos": ["/quem-somos"],
  contato: ["/contato"],
  editais: ["/editais"],
  transparencia: ["/transparencia"],
};

export function revalidatePaginaPublica(pagina_slug: string) {
  const paths = SLUG_PATHS[pagina_slug] ?? [];
  for (const p of paths) {
    revalidatePath(p);
  }
}
