import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function EditaisDocumentosLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.documentos);
}
