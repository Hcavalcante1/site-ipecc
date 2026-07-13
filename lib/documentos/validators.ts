import { createHash } from "crypto";
import {
  GD_ALLOWED_EXTENSIONS,
  GD_MIME_BY_EXTENSION,
} from "./types";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function extensionFromName(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function validarArquivoGestaoDocumental(opts: {
  fileName: string;
  mimeType?: string | null;
  size: number;
  maxBytes?: number;
}): { ok: true; extension: string } | { ok: false; error: string } {
  const max = opts.maxBytes ?? 20 * 1024 * 1024;
  if (opts.size <= 0) {
    return { ok: false, error: "Arquivo vazio." };
  }
  if (opts.size > max) {
    return { ok: false, error: "Arquivo excede o limite de 20MB." };
  }
  const extension = extensionFromName(opts.fileName);
  if (!GD_ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: "Extensão não permitida. Use PDF, DOCX, imagem ou TXT.",
    };
  }
  const mime = opts.mimeType || "";
  const allowed = GD_MIME_BY_EXTENSION[extension];
  if (mime && allowed && !allowed.has(mime)) {
    return { ok: false, error: "Tipo de arquivo não permitido." };
  }
  return { ok: true, extension };
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function validarTituloDocumento(title: unknown): string | null {
  const t = String(title || "").trim();
  if (!t) return null;
  if (t.length > 300) return t.slice(0, 300);
  return t;
}
