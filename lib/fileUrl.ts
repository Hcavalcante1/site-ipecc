export function fileUrl(url?: string | null) {
  if (!url) return "";

  const clean = url.trim();

  if (clean.includes("/storage/v1/object/")) {
    const partes = clean.split("/storage/v1/object/");
    return `/api/download/${partes[1]}`;
  }

  if (clean.startsWith("transparencia/")) {
    return `/api/download/public/docs/${clean}`;
  }

  return clean;
}