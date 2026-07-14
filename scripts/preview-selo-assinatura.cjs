/**
 * Prévia PNG do selo (logo original + fontes anteriores + miolo = largura do nome).
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const QRCode = require("qrcode");
const sharp = require("sharp");

async function main() {
  const SELO_SIDE_PT = 36;
  const SELO_PAD_PT = 2.5;
  const SELO_GAP_PT = 1.25;
  const SELO_INSET_PT = 0.75;

  const fontDoc = await PDFDocument.create();
  const font = await fontDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await fontDoc.embedFont(StandardFonts.HelveticaBold);

  const nome = "HELIO CAVALCANTE";
  const cargo = "PRESIDENTE";
  const cpfFmt = "251.334.980-76";
  const codigo = "FFD7B64C0BFE";
  const dataStr = "14/07/2026 09:12";

  const side = SELO_SIDE_PT;
  const pad = SELO_PAD_PT;
  const gap = SELO_GAP_PT;
  const inset = SELO_INSET_PT;

  function caberTexto(texto, f, size, maxWidth) {
    const t = texto.trim();
    if (f.widthOfTextAtSize(t, size) <= maxWidth) return t;
    let out = t;
    while (out.length > 1 && f.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  const linhasBase = [
    { text: "Documento assinado digitalmente", size: 5.2, bold: false },
    { text: nome.toUpperCase(), size: 6.8, bold: true },
    { text: `Data: ${dataStr}`, size: 5.2, bold: false },
    { text: `${cargo} · CPF ${cpfFmt}`, size: 5, bold: false },
    { text: `Lei 14.063/2020 · ${codigo}`, size: 4.5, bold: false },
  ];

  let textW = 120;
  for (const l of linhasBase) {
    const f = l.bold ? fontBold : font;
    textW = Math.max(textW, f.widthOfTextAtSize(l.text, l.size));
  }
  textW += 2;
  const linhas = linhasBase;

  const SCALE = 5;
  const s = side * SCALE;
  const p = pad * SCALE;
  const g = gap * SCALE;
  const ins = inset * SCALE;
  const tw = textW * SCALE;
  const bw = Math.round(p + s + g + tw + g + s + p);
  const bh = Math.round(s + p * 2);

  const logoPath = path.join(
    process.cwd(),
    "public",
    "media",
    "global",
    "logos",
    "ipecc_logo_v2.png"
  );
  const logo = await sharp(logoPath)
    .resize(Math.round(s - ins * 2), Math.round(s - ins * 2), {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();

  const qr = await QRCode.toBuffer(
    "https://ipecc.org.br/validar/" + codigo,
    {
      type: "png",
      width: Math.round(s - ins * 2),
      margin: 0,
      color: { dark: "#0059bf", light: "#ffffffff" },
    }
  );

  const lineGapPx = 1.1 * SCALE;
  const blockHPx =
    linhas.reduce((a, l) => a + l.size * SCALE, 0) +
    lineGapPx * (linhas.length - 1);
  let ty = p + (s - blockHPx) / 2;
  const colL = p + s + g;

  const texts = linhas
    .map((l) => {
      const size = l.size * SCALE;
      ty += size;
      const f = l.bold ? fontBold : font;
      const wPt = f.widthOfTextAtSize(l.text, l.size);
      const tx = colL + (tw - wPt * SCALE) / 2;
      const fill = l.text.startsWith("Lei")
        ? "#0059bf"
        : l.bold
          ? "#1f2428"
          : "#474d54";
      const weight = l.bold ? 700 : 400;
      const el = `<text x="${tx}" y="${ty}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${l.text}</text>`;
      ty += lineGapPx;
      return el;
    })
    .join("");

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">
      <rect width="100%" height="100%" fill="#f5faff" stroke="#c5ced8" stroke-width="1.5"/>
      ${texts}
    </svg>`
  );

  const outBuf = await sharp(svg)
    .composite([
      { input: logo, left: Math.round(p + ins), top: Math.round(p + ins) },
      {
        input: qr,
        left: Math.round(bw - p - s + ins),
        top: Math.round(p + ins),
      },
    ])
    .png()
    .toBuffer();

  const outPublic = path.join(
    "public",
    "media",
    "global",
    "logos",
    "preview-selo-assinatura.png"
  );
  const outAssets = path.join(
    process.env.USERPROFILE,
    ".cursor",
    "projects",
    "c-Users-helio-Downloads-public-site-v3-heroes-padronizados-corrigido",
    "assets",
    "preview-selo-assinatura.png"
  );
  fs.writeFileSync(outPublic, outBuf);
  fs.writeFileSync(outAssets, outBuf);
  console.log("OK", outPublic, `${bw}x${bh}`, "textW_pt=", textW.toFixed(1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
