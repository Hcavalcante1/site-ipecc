import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("digital_media")
    .select(
      "id, file_name, storage_path, public_url, mime_type, file_size, alt_text, created_at, deleted_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || data.deleted_at) {
    return NextResponse.json({ ok: false, error: "Mídia não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, media: data });
}

/** Exclusão lógica. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;
  const { id } = await ctx.params;

  const { error } = await supabaseAdmin
    .from("digital_media")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
