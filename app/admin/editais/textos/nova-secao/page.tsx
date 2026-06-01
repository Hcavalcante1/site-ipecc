import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Seções em editais_secoes não alimentam a página pública atual. */
export default function EditaisNovaSecaoLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.textos);
}
