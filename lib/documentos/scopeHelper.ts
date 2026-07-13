import { NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  obterDocumento,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

export type AuthDocumentos = NonNullable<
  Awaited<ReturnType<typeof denyIfSemModuloDocumentos>>["auth"]
>;

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export { tabelaAusente };

/** Carrega documento e valida escopo. Por padrão ignora soft-deleted. */
export async function carregarDocumentoNoEscopo(
  id: string,
  auth: AuthDocumentos,
  opts?: { allowDeleted?: boolean }
) {
  const { data, error } = await obterDocumento(id);
  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        error: NextResponse.json(
          {
            ok: false,
            error:
              "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
          },
          { status: 503 }
        ),
      };
    }
    return {
      error: NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      ),
    };
  }
  if (!data) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Documento não encontrado." },
        { status: 404 }
      ),
    };
  }
  if (data.deleted_at && !opts?.allowDeleted) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Documento está na lixeira." },
        { status: 404 }
      ),
    };
  }
  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(data.processo_id, processoIds)) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Documento fora do seu escopo." },
        { status: 403 }
      ),
    };
  }
  return { data };
}
