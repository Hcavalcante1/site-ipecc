import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Documentos exigidos — rota canônica no hub de páginas. */
export default function EditaisTextosLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.documentos);
}
