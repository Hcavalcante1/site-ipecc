import { redirect } from "next/navigation";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

type Props = {
  params: Promise<{ id: string }>;
};

/** Cadastro de edital — rota canônica em /admin/editais/[id]. */
export default async function PaginasEditaisIdRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(adminCanonicalRoutes.editaisCadastro.editar(id));
}
