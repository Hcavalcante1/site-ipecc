"use client";

type StorageResult = {
  data: { path: string } | null;
  error: { message: string } | null;
};

/** Upload via /api/admin/storage/upload (service role). */
export async function adminStorageUpload(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
): Promise<StorageResult> {
  const form = new FormData();
  form.append("bucket", bucket);
  form.append("path", path);
  form.append("file", file);
  if (options?.upsert) form.append("upsert", "true");
  if (options?.contentType) form.append("contentType", options.contentType);

  const res = await fetch("/api/admin/storage/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    data?: { path: string };
  };

  if (!res.ok || !json.ok) {
    return {
      data: null,
      error: { message: json.error || `Falha no upload (${res.status})` },
    };
  }

  return { data: json.data ?? { path }, error: null };
}
