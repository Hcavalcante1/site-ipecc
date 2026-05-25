export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PDF_ACCEPT = "application/pdf,.pdf";

export function validatePdfFile(file: File) {
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Envie apenas arquivos PDF.");
  }

  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    throw new Error("O arquivo deve ter no maximo 10 MB.");
  }
}

export function normalizeStorageFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function buildStorageFileName(file: File, type?: string) {
  const parts = [Date.now(), crypto.randomUUID(), type].filter(Boolean);
  return `${parts.join("-")}-${normalizeStorageFileName(file.name)}`;
}
