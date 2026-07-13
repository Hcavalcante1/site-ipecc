import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_document_logs")
    .select(
      "id, action, document_id, processo_id, actor_email, created_at, detail"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        logs: [],
        aviso:
          "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const logs = (data || []).filter(
    (row) =>
      !row.processo_id ||
      registroNoEscopoProcesso(row.processo_id, processoIds)
  );

  return NextResponse.json({ ok: true, logs });
}
