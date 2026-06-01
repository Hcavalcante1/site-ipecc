import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function EditaisMuralLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.mural);
}
