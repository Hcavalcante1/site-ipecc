// scripts/check-site.mjs
import fs from "node:fs";
import path from "node:path";

const SEEDS = ["/", "/quem-somos", "/projetos", "/cotacoes", "/transparencia", "/contato", "/acoes"];
const MAX_PAGES = 200;

const isInternal = (href, base) => {
  if (!href) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
  try {
    const u = new URL(href, base);
    return u.origin === new URL(base).origin;
  } catch {
    return href.startsWith("/") || href.startsWith("./") || href.startsWith("../");
  }
};
const normalizePath = (p) => {
  try {
    const u = new URL(p, "http://x");
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return p.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
  }
};
const extractLinks = (html) => {
  const hrefs = [...html.matchAll(/\shref\s*=\s*"(.*?)"/gi)].map(m => m[1]);
  const srcs  = [...html.matchAll(/\ssrc\s*=\s*"(.*?)"/gi)].map(m => m[1]);
  return { hrefs, srcs };
};

// HTTP mode
async function crawlHttp(baseUrl) {
  console.log(`🌐 HTTP mode — base: ${baseUrl}`);
  const visited = new Set();
  const queue = [...SEEDS.map(s => new URL(s, baseUrl).href)];
  const errors = [];

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let res;
    try { res = await fetch(url, { redirect: "follow" }); }
    catch (e) { errors.push({ type: "fetch", target: url, note: e.message }); continue; }

    if (!res.ok) { errors.push({ type: "status", target: url, note: `HTTP ${res.status}` }); continue; }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) continue;

    const html = await res.text();
    const { hrefs, srcs } = extractLinks(html);

    for (const h of hrefs) {
      if (!isInternal(h, baseUrl)) continue;
      const next = new URL(h, url).href.split("#")[0];
      if (!visited.has(next) && !queue.includes(next)) queue.push(next);
    }
    for (const s of srcs) {
      const u = new URL(s, url);
      if (u.origin !== new URL(baseUrl).origin) continue;
      try {
        const r = await fetch(u.href, { method: "HEAD" });
        if (!r.ok) errors.push({ type: "img", target: u.href, note: `HTTP ${r.status}` });
      } catch (e) { errors.push({ type: "img", target: u.href, note: e.message }); }
    }
  }
  return { visited: [...visited], errors };
}

// Static (out) mode
function crawlStatic(outDir) {
  console.log(`📦 STATIC mode — dir: ${outDir}`);
  const norm = (p) => normalizePath(p);
  const visited = new Set();
  const queue = [...SEEDS.map(norm)];
  const errors = [];

  const resolveFile = (route) => {
    if (route === "/") return path.join(outDir, "index.html");
    const idx = path.join(outDir, route, "index.html");
    const direct = path.join(outDir, `${route}.html`);
    if (fs.existsSync(idx)) return idx;
    if (fs.existsSync(direct)) return direct;
    return null;
  };

  while (queue.length && visited.size < MAX_PAGES) {
    const route = queue.shift();
    if (visited.has(route)) continue;
    visited.add(route);

    const file = resolveFile(route);
    if (!file) { errors.push({ type: "route", target: route, note: "arquivo HTML não encontrado no /out" }); continue; }

    let html = "";
    try { html = fs.readFileSync(file, "utf8"); }
    catch (e) { errors.push({ type: "read", target: file, note: e.message }); continue; }

    const { hrefs, srcs } = extractLinks(html);

    for (const h of hrefs) {
      if (!isInternal(h, "http://local.test")) continue;
      const p = norm(h);
      if (!visited.has(p) && !queue.includes(p)) queue.push(p);
    }
    for (const s of srcs) {
      if (!isInternal(s, "http://local.test")) continue;
      let fp = s.startsWith("/") ? path.join(outDir, s) : path.join(path.dirname(file), s);
      const candidates = [fp, fp.replace(/\/$/, "/index.html")];
      const ok = candidates.some(c => fs.existsSync(c));
      if (!ok) errors.push({ type: "img", target: s, where: file, note: "arquivo não encontrado" });
    }
  }
  return { visited: [...visited], errors };
}

// CLI
const args = process.argv.slice(2);
const httpIdx = args.indexOf("--http");
const dirIdx  = args.indexOf("--dir");

(async () => {
  let result;
  if (httpIdx !== -1 && args[httpIdx + 1]) {
    const base = args[httpIdx + 1].replace(/\/$/, "");
    result = await crawlHttp(base);
  } else if (dirIdx !== -1 && args[dirIdx + 1]) {
    const outDir = path.resolve(args[dirIdx + 1]);
    result = crawlStatic(outDir);
  } else {
    console.error("Uso:\n  node scripts/check-site.mjs --http http://localhost:3000\n  node scripts/check-site.mjs --dir ./out");
    process.exit(2);
  }

  console.log("\n========== RELATÓRIO ==========");
  console.log(`Páginas verificadas: ${result.visited.length}`);
  if (result.errors.length === 0) {
    console.log("✅ Nenhum problema encontrado.");
    process.exit(0);
  } else {
    console.log(`❌ Problemas: ${result.errors.length}`);
    for (const e of result.errors) {
      console.log(`- [${e.type}] ${e.target}${e.where ? `  (em: ${e.where})` : ""}  ${e.note ? ` → ${e.note}` : ""}`);
    }
    process.exit(1);
  }
})();

