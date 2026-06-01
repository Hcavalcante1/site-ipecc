import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Mesmo bloco CMS que bloco-principal — rota legada redireciona. */
export default function QuemSomosInstitucionalRedirectPage() {
  redirect(adminCanonicalRoutes.quemSomos.blocoPrincipal);
}
