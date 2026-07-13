import type { GdPreviewKind } from "./types";

export function previewKindFromMime(
  mimeType: string | null | undefined,
  fileName?: string | null
): GdPreviewKind {
  const mime = (mimeType || "").toLowerCase();
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
  ) {
    return "image";
  }
  if (mime.startsWith("text/") || ext === "txt") return "text";
  return "unsupported";
}

export function normalizarTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60);
  if (!tag) return null;
  if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(tag)) return null;
  return tag;
}
