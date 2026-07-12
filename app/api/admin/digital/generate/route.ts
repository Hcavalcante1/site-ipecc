import { NextResponse } from "next/server";
import { generateDigitalDrafts } from "@/lib/digital/draftAgent";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const { denied, auth } = await denyIfSemModuloDigital();
  if (denied || !auth) return denied!;

  try {
    const result = await generateDigitalDrafts(supabaseAdmin, {
      persist: true,
      createdBy: auth.contexto.email ?? auth.contexto.userId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      drafts: result.drafts.map((d) => ({
        title: d.title,
        source_type: d.source_type,
        source_id: d.source_id,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao gerar rascunhos";
    const missing = message.includes("digital_posts") || message.includes("42P01");
    return NextResponse.json(
      {
        ok: false,
        error: missing
          ? "Tabelas Digital ausentes. Aplique docs/sql/digital-redes-fase1.sql no Supabase."
          : message,
      },
      { status: 500 }
    );
  }
}
