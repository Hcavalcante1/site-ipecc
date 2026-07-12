import { NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("digital_media")
    .select(
      "id, file_name, storage_path, public_url, mime_type, file_size, alt_text, created_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    const missing =
      error.message.includes("digital_media") || error.code === "42P01";
    return NextResponse.json({
      ok: true,
      media: [],
      aviso: missing
        ? "Tabela digital_media ausente. Aplique docs/sql/digital-redes-automation-phase1.sql."
        : error.message,
    });
  }

  return NextResponse.json({ ok: true, media: data ?? [] });
}
