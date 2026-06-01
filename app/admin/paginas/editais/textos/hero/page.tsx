import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function PaginasEditaisTextosHeroRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.hero);
}
