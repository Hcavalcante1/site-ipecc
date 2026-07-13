import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_BUCKETS = new Set([
  "docs",
  "editais",
  "propostas",
  "media",
  "gestao-documental",
]);
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS_BY_BUCKET: Record<string, Set<string>> = {
  docs: new Set(["pdf", "png", "jpg", "jpeg", "webp"]),
  editais: new Set(["pdf"]),
  propostas: new Set(["pdf"]),
  media: new Set(["png", "jpg", "jpeg", "webp"]),
  "gestao-documental": new Set([
    "pdf",
    "docx",
    "doc",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "txt",
  ]),
};
const ALLOWED_MIME_BY_EXTENSION: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ]),
  doc: new Set(["application/msword", "application/octet-stream"]),
  png: new Set(["image/png"]),
  jpg: new Set(["image/jpeg"]),
  jpeg: new Set(["image/jpeg"]),
  webp: new Set(["image/webp"]),
  txt: new Set(["text/plain", "application/octet-stream"]),
};

function isSafeStoragePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 300 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("//") &&
    !path.split("/").some((part) => part === "." || part === ".." || part === "")
  );
}

function extensionFromPath(path: string) {
  return path.split("/").pop()?.split(".").pop()?.toLowerCase() || "";
}

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
        { ok: false, error: "Repositório, caminho e arquivo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { ok: false, error: `Repositório não permitido: ${bucket}` },
        { status: 400 }
      );
    }

    if (!isSafeStoragePath(path)) {
      return NextResponse.json(
        { ok: false, error: "Caminho de envio inválido" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Arquivo excede o limite de 20MB" },
        { status: 400 }
      );
    }

    const extension = extensionFromPath(path);
    const allowedExtensions = ALLOWED_EXTENSIONS_BY_BUCKET[bucket];

    if (!allowedExtensions?.has(extension)) {
      return NextResponse.json(
        { ok: false, error: "Extensão não permitida para este repositório" },
        { status: 400 }
      );
    }

    const effectiveContentType = contentType || file.type || undefined;
    const allowedMimeTypes = ALLOWED_MIME_BY_EXTENSION[extension];

    if (
      effectiveContentType &&
      allowedMimeTypes &&
      !allowedMimeTypes.has(effectiveContentType)
    ) {
      return NextResponse.json(
        { ok: false, error: "Tipo de arquivo não permitido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      upsert,
      contentType: effectiveContentType,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no envio do arquivo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
