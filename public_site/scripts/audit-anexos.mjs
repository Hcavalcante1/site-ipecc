import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const publicDir = path.join(root, "public");
const checkedPrefixes = ["/docs/", "/media/"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const refs = new Map();
const referencePattern = /["'(]((?:\/docs\/|\/media\/)[^"'()\s?#]+)["')]/g;

for (const file of walk(appDir)) {
  const contents = fs.readFileSync(file, "utf8");
  for (const match of contents.matchAll(referencePattern)) {
    const assetPath = match[1];
    if (!checkedPrefixes.some((prefix) => assetPath.startsWith(prefix))) continue;
    const locations = refs.get(assetPath) ?? [];
    locations.push(path.relative(root, file));
    refs.set(assetPath, locations);
  }
}

const missing = [];
for (const [assetPath, locations] of refs) {
  const diskPath = path.join(publicDir, assetPath.slice(1));
  if (!fs.existsSync(diskPath)) {
    missing.push({ assetPath, locations: [...new Set(locations)] });
  }
}

console.log(`Anexos/arquivos publicos referenciados: ${refs.size}`);

if (missing.length > 0) {
  console.error(`Anexos ausentes: ${missing.length}`);
  for (const item of missing) {
    console.error(`- ${item.assetPath} (${item.locations.join(", ")})`);
  }
  process.exit(1);
}

console.log("Audit de anexos concluido sem pendencias.");
