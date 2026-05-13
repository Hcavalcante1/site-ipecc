import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadPdfToSupabaseParams = {
  file: File;
  bucket: string;
  folder: string;
  supabaseUrl: string;
  supabaseClient: SupabaseClient;
};

export async function uploadPdfToSupabase({
  file,
  bucket,
  folder,
  supabaseUrl,
  supabaseClient,
}: UploadPdfToSupabaseParams): Promise<string> {
  if (!file) {
    throw new Error("Arquivo não encontrado.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Apenas PDF permitido.");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Arquivo deve ter extensão .pdf");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Arquivo muito grande (máx 5MB).");
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");

  const fileName = `${Date.now()}-${safeName}`;
  const normalizedFolder = folder.replace(/^\/+|\/+$|\\/g, "").replace(/\/+/g, "/");
  const path = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file);

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`);
  }

  const cleanUrl = supabaseUrl.replace(/\/+$/, "");
  return `${cleanUrl}/storage/v1/object/public/${bucket}/${path}`;
}
