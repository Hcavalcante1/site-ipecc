import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_BUCKETS = new Set(["docs", "editais", "propostas", "media"]);

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const bucket = String(formData.get("bucket") || "");
    const path = String(formData.get("path") || "");
    const file = formData.get("file");
    const upsert = formData.get("upsert") === "true";
    const contentType = formData.get("contentType")?.toString();

    if (!bucket || !path || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "bucket, path e file são obrigatórios" },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { ok: false, error: `Bucket não permitido: ${bucket}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      upsert,
      contentType: contentType || undefined,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no upload";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
