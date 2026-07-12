import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Rota legada — painel canônico em /admin. */
export default function AdminDashboardRedirectPage() {
  redirect(adminCanonicalRoutes.dashboard);
}
