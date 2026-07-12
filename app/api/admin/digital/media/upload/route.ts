import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createHash, randomUUID } from "crypto";

const BUCKET = "digital-media";
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

function safeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 120);
}

/** Upload de mídia escolhida pelo admin (não escolhida pelo sistema). */
export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDigital();
  if (denied) return denied;

  const form = await req.formData();
  const file = form.get("file");
  const altText = String(form.get("alt_text") || "").trim() || null;

  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { ok: false, error: "Arquivo obrigatório (campo file)." },
      { status: 400 }
    );
  }

  const mime = (file.type || "").toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tipo não permitido. Use JPEG, PNG, WebP ou MP4.",
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Arquivo acima de 50 MB." },
      { status: 400 }
    );
  }

  const original =
    typeof (file as File).name === "string"
      ? safeName((file as File).name)
      : `media.${ext}`;
  const id = randomUUID();
  const storagePath = `${id}/${original.endsWith(`.${ext}`) ? original : `${original}.${ext}`}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    const missingBucket = /bucket|not found|does not exist/i.test(upErr.message);
    return NextResponse.json(
      {
        ok: false,
        error: missingBucket
          ? `Bucket "${BUCKET}" ausente no Storage. Crie-o no Supabase (privado) e tente de novo.`
          : upErr.message,
      },
      { status: 500 }
    );
  }

  const { data: signed } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: row, error: dbErr } = await supabaseAdmin
    .from("digital_media")
    .insert({
      id,
      file_name: original,
      storage_path: storagePath,
      public_url: signed?.signedUrl || null,
      mime_type: mime,
      file_size: file.size,
      checksum,
      alt_text: altText,
      created_by: auth?.userId ?? null,
    })
    .select(
      "id, file_name, storage_path, public_url, mime_type, file_size, alt_text, created_at"
    )
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, media: row });
}
