import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("digital_publish_logs")
    .select("id, event_type, severity, message, details, platform, account_id, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, logs: data ?? [] });
}
