import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function EditaisTextosHeroLegacyRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.hero);
}
