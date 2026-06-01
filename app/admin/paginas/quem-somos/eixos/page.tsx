import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

/** Mesmos blocos atuacao_* que atuacao — rota legada redireciona. */
export default function QuemSomosEixosRedirectPage() {
  redirect(adminCanonicalRoutes.quemSomos.atuacao);
}
