import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { podeModulo } from "@/lib/auth/adminEscopo";

/** Bloqueia se a sessão não tiver o módulo Documentos (mestre ou escopo). */
export async function denyIfSemModuloDocumentos() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return {
      denied: NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status }
      ),
      auth: null as null,
    };
  }
  if (!podeModulo(auth.contexto, "documentos")) {
    return {
      denied: NextResponse.json(
        {
          ok: false,
          error:
            "Sem permissão para o módulo Gestão Documental. Peça ao mestre para marcar Documentos em /admin/acessos.",
        },
        { status: 403 }
      ),
      auth: null as null,
    };
  }
  return { denied: null, auth };
}
