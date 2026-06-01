import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Hero público vem de paginas_conteudo, não editais_secoes. */
export default function EditaisHeroLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.hero);
}
