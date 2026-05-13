export function getDownloadUrl(url?: string | null) {
  if (!url) return "";

  let clean = url.trim();

  if (!clean.includes("/storage/v1/object/")) return clean;

  const partes = clean.split("/storage/v1/object/");
  if (!partes[1]) return clean;

  let path = partes[1];

  // 🔥 BLINDAGEM
  path = path.replace(/^public\//, "");
  path = path.replace(/public\/public/g, "public");

  return `/api/download/${path}`;
}

export function isValidFileUrl(url?: string | null) {
  if (!url) return false;

  const clean = url.trim();

  if (!clean) return false;
  if (clean.startsWith("mailto:")) return false;
  if (clean === "#") return false;

  return true;
}