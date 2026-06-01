import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function PaginasEditaisNovaSecaoRedirectPage() {
  redirect(adminCanonicalRoutes.editaisCms.textos);
}
