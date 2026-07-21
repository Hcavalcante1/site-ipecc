import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { validationBaseUrl } from "./constants";

/** Horizontal legado / atalho. */
export type PosicaoAssinatura =
  | "esquerda"
  | "centro"
  | "direita"
  | "rodape_esquerda"
  | "rodape_centro"
  | "rodape_direita";

export type ZonaVerticalAssinatura = "topo" | "meio" | "rodape";

export type ModoPaginaAssinatura = "ultima" | "numero" | "nova";

export type StampPlacement = {
  modoPagina: ModoPaginaAssinatura;
  /** 1-based quando modoPagina=numero */
  pagina?: number;
  posicao?: PosicaoAssinatura;
  zona?: ZonaVerticalAssinatura;
  /**
   * Posição livre na página (0–100).
   * xPct: 0 = esquerda, 100 = direita (âncora = canto esquerdo do selo).
   * yPct: 0 = topo, 100 = rodapé (âncora = topo do selo).
   * Se informados, prevalecem sobre zona/posicao.
   */
  xPct?: number;
  yPct?: number;
};

const COR = {
  faixa: rgb(0.0, 0.36, 0.75),
  fundo: rgb(0.96, 0.98, 1),
  borda: rgb(0.72, 0.78, 0.86),
  titulo: rgb(0.12, 0.14, 0.16),
  corpo: rgb(0.28, 0.3, 0.33),
};

const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public", "media", "global", "logos", "ipecc_logo_v2.png"),
];

/**
 * Selo: logo = QR; fontes no tamanho anterior; miolo na largura do texto
 * (sem vãos brancos entre logo↔nome↔QR).
 */
export const SELO_SIDE_PT = 36;
export const SELO_PAD_PT = 2.5;
export const SELO_GAP_PT = 1.25;
export const SELO_INSET_PT = 0.75;
/** Só piso mínimo — a largura real do miolo vem do texto. */
export const SELO_TEXT_W_PT = 120;

/** Fallback de proporções (a caixa real no PDF usa a largura do texto). */
export function seloBoxPts(): { boxW: number; boxH: number } {
  const side = SELO_SIDE_PT;
  const pad = SELO_PAD_PT;
  const gap = SELO_GAP_PT;
  const textW = SELO_TEXT_W_PT;
  return {
    boxW: pad + side + gap + textW + gap + side + pad,
    boxH: side + pad * 2,
  };
}

function soDigitos(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

export function formatarCpfExibicao(cpf: string): string {
  const d = soDigitos(cpf);
  if (d.length !== 11) return cpf.trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function validarCpfBasico(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  return true;
}

function clampPct(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, v));
}

/** Data legível (sem ISO / offset). */
function formatarDataSimples(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleString("pt-BR");
  }
}

function caberTexto(
  texto: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string {
  const t = texto.trim();
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  let out = t;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function quebrarTexto(
  texto: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const t = String(texto || "").trim();
  if (!t) return [""];
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return [t];

  const out: string[] = [];
  const words = t.split(/\s+/).filter(Boolean);
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) out.push(trimmed);
    current = "";
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) pushCurrent();

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const ch of word) {
      const test = `${chunk}${ch}`;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        chunk = test;
      } else {
        if (chunk) out.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  }

  pushCurrent();
  return out.length ? out : [t];
}

function desenharSeloCompacto(opts: {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  nome: string;
  cpf: string;
  cargo?: string | null;
  signedAt: Date;
  timezone: string;
  validationCode: string;
  qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  xPct: number;
  yPct: number;
}) {
  const { page, font, fontBold } = opts;
  const { width, height } = page.getSize();
  const nome = opts.nome.trim();
  const cargo = String(opts.cargo || "").trim();
  const cpfFmt = formatarCpfExibicao(opts.cpf);
  const codigo = String(opts.validationCode || "").trim() || "-";

  const side = SELO_SIDE_PT;
  const pad = SELO_PAD_PT;
  const gap = SELO_GAP_PT;
  const inset = SELO_INSET_PT;
  const leftColW = 190;
  const rightColW = 52;

  const lines: {
    text: string;
    size: number;
    bold?: boolean;
    color: typeof COR.corpo;
  }[] = [
    { text: "Documento assinado digitalmente", size: 5.1, color: COR.corpo },
    { text: nome.toUpperCase(), size: 6.9, bold: true, color: COR.titulo },
    { text: `CNPJ: ${cpfFmt}`, size: 5.0, color: COR.corpo },
    ...(cargo
      ? [{ text: `Responsavel: ${cargo}`, size: 4.9, color: COR.corpo }]
      : []),
    { text: `CPF: ${cpfFmt}`, size: 4.9, color: COR.corpo },
    {
      text: `Data: ${formatarDataSimples(opts.signedAt, opts.timezone)}`,
      size: 5.0,
      color: COR.corpo,
    },
    {
      text: `Codigo de validacao: ${codigo}`,
      size: 4.8,
      bold: true,
      color: COR.faixa,
    },
  ];

  const leftRendered = lines.flatMap((line) => {
    const f = line.bold ? fontBold : font;
    return quebrarTexto(line.text, f, line.size, leftColW).map((text) => ({
      ...line,
      text,
    }));
  });

  const leftHeight = leftRendered.reduce((sum, line) => sum + line.size + 1, 0);
  const rightHeight = side + 14;
  const boxW = pad + side + gap + leftColW + gap + rightColW + pad;
  const boxH = Math.max(78, Math.ceil(Math.max(leftHeight + pad * 2, rightHeight + pad * 2)));
  const { x, y } = origemLivre(width, height, boxW, boxH, opts.xPct, opts.yPct);

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    opacity: 0.97,
    borderColor: COR.borda,
    borderWidth: 0.45,
  });

  const logoX = x + pad;
  const logoY = y + pad;
  const icon = side - inset * 2;
  if (opts.logoImage) {
    page.drawImage(opts.logoImage, {
      x: logoX + inset,
      y: logoY + inset,
      width: icon,
      height: icon,
    });
  } else {
    page.drawRectangle({
      x: logoX + inset,
      y: logoY + inset,
      width: icon,
      height: icon,
      borderColor: COR.faixa,
      borderWidth: 0.7,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText("IPECC", {
      x: logoX + inset + 3,
      y: logoY + inset + icon / 2 - 2.5,
      size: 6,
      font: fontBold,
      color: COR.faixa,
    });
  }

  const colLeft = x + pad + side + gap;
  let cursorY = y + boxH - pad - 3;
  for (const linha of leftRendered) {
    const f = linha.bold ? fontBold : font;
    cursorY -= linha.size;
    page.drawText(linha.text, {
      x: colLeft,
      y: cursorY,
      size: linha.size,
      font: f,
      color: linha.color,
      maxWidth: leftColW,
      lineHeight: linha.size + 1,
    });
    cursorY -= 1;
  }

  const qrX = x + pad + side + gap + leftColW + gap + Math.max(0, (rightColW - side) / 2);
  page.drawImage(opts.qrImage, {
    x: qrX + inset,
    y: y + boxH - pad - side - 4,
    width: icon,
    height: icon,
  });

  page.drawText("VALIDAR ITI", {
    x: qrX - 1,
    y: y + 11.5,
    size: 4.9,
    font: fontBold,
    color: COR.titulo,
    maxWidth: rightColW + 2,
    lineHeight: 5.0,
  });
  page.drawText("verifique em validar.iti.gov.br", {
    x: qrX - 3,
    y: y + 5.5,
    size: 4.2,
    font,
    color: COR.corpo,
    maxWidth: rightColW + 6,
    lineHeight: 4.4,
  });
}

function presetsParaPct(
  posicao?: PosicaoAssinatura,
  zona?: ZonaVerticalAssinatura
): { xPct: number; yPct: number } {
  let h: "esquerda" | "centro" | "direita" = "direita";
  let z: ZonaVerticalAssinatura = zona || "rodape";
  if (posicao === "rodape_esquerda" || posicao === "esquerda") h = "esquerda";
  else if (posicao === "rodape_centro" || posicao === "centro") h = "centro";
  else if (posicao === "rodape_direita" || posicao === "direita") h = "direita";
  if (posicao?.startsWith("rodape_")) z = "rodape";

  const xPct = h === "esquerda" ? 0 : h === "centro" ? 50 : 100;
  const yPct = z === "topo" ? 4 : z === "meio" ? 50 : 96;
  return { xPct, yPct };
}

function origemLivre(
  pageWidth: number,
  pageHeight: number,
  boxW: number,
  boxH: number,
  xPct: number,
  yPct: number
): { x: number; y: number } {
  const margin = 18;
  const spanX = Math.max(0, pageWidth - boxW - 2 * margin);
  const spanY = Math.max(0, pageHeight - boxH - 2 * margin);
  const x = margin + (spanX * clampPct(xPct, 50)) / 100;
  const y = pageHeight - boxH - margin - (spanY * clampPct(yPct, 96)) / 100;
  return { x, y };
}

async function carregarLogoPng(): Promise<Buffer | null> {
  for (const p of LOGO_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    try {
      const px = Math.round(SELO_SIDE_PT * 5);
      // Logo original — proporção preservada (contain), sem crop
      return await sharp(p)
        .resize(px, px, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer();
    } catch {
      continue;
    }
  }
  return null;
}

function desenharSelo(opts: {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  nome: string;
  cpf: string;
  cargo?: string | null;
  signedAt: Date;
  timezone: string;
  validationCode: string;
  qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  xPct: number;
  yPct: number;
}) {
  const { page, font, fontBold } = opts;
  const { width, height } = page.getSize();
  const nome = opts.nome.trim();
  const cargo = String(opts.cargo || "").trim();
  const cpfFmt = formatarCpfExibicao(opts.cpf);

  const side = SELO_SIDE_PT;
  const pad = SELO_PAD_PT;
  const gap = SELO_GAP_PT;
  const inset = SELO_INSET_PT;
  const codigo = String(opts.validationCode || "").trim();

  desenharSeloCompacto({
    page,
    font,
    fontBold,
    nome: opts.nome,
    cpf: opts.cpf,
    cargo: opts.cargo,
    signedAt: opts.signedAt,
    timezone: opts.timezone,
    validationCode: codigo,
    qrImage: opts.qrImage,
    logoImage: opts.logoImage,
    xPct: opts.xPct,
    yPct: opts.yPct,
  });
  return;

  // Fontes no tamanho anterior
  const linhasBase: {
    text: string;
    size: number;
    bold?: boolean;
    color: typeof COR.corpo;
  }[] = [
    {
      text: "Documento assinado digitalmente",
      size: 5.2,
      color: COR.corpo,
    },
    {
      text: nome.toUpperCase(),
      size: 6.8,
      bold: true,
      color: COR.titulo,
    },
    {
      text: `Data: ${formatarDataSimples(opts.signedAt, opts.timezone)}`,
      size: 5.2,
      color: COR.corpo,
    },
    {
      text: cargo ? `${cargo} · CPF ${cpfFmt}` : `CPF ${cpfFmt}`,
      size: 5,
      color: COR.corpo,
    },
    {
      text: `Lei 14.063/2020 · ${codigo}`,
      size: 4.5,
      color: COR.faixa,
    },
  ];

  // Miolo = linha mais larga (CPF, Lei etc. aparecem por completo)
  let textW = SELO_TEXT_W_PT;
  for (const l of linhasBase) {
    const f = l.bold ? fontBold : font;
    textW = Math.max(textW, f.widthOfTextAtSize(l.text, l.size));
  }
  textW += 2;

  const boxW = pad + side + gap + textW + gap + side + pad;
  const boxH = side + pad * 2;
  const { x, y } = origemLivre(width, height, boxW, boxH, opts.xPct, opts.yPct);

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    opacity: 0.97,
    borderColor: COR.borda,
    borderWidth: 0.45,
  });

  const logoX = x + pad;
  const logoY = y + pad;
  const qrX = x + boxW - pad - side;
  const icon = side - inset * 2;

  if (opts.logoImage) {
    page.drawImage(opts.logoImage, {
      x: logoX + inset,
      y: logoY + inset,
      width: icon,
      height: icon,
    });
  } else {
    page.drawRectangle({
      x: logoX + inset,
      y: logoY + inset,
      width: icon,
      height: icon,
      borderColor: COR.faixa,
      borderWidth: 0.7,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText("IPECC", {
      x: logoX + inset + 3,
      y: logoY + inset + icon / 2 - 2.5,
      size: 6,
      font: fontBold,
      color: COR.faixa,
    });
  }

  const colLeft = x + pad + side + gap;
  const lineGap = 1.1;
  const blockH =
    linhasBase.reduce((a, l) => a + l.size, 0) +
    lineGap * (linhasBase.length - 1);
  let cursorY = y + pad + (side + blockH) / 2;

  for (const linha of linhasBase) {
    cursorY -= linha.size;
    const f = linha.bold ? fontBold : font;
    const tw = f.widthOfTextAtSize(linha.text, linha.size);
    const textX = colLeft + Math.max(0, (textW - tw) / 2);
    page.drawText(linha.text, {
      x: textX,
      y: cursorY,
      size: linha.size,
      font: f,
      color: linha.color,
    });
    cursorY -= lineGap;
  }

  page.drawImage(opts.qrImage, {
    x: qrX + inset,
    y: logoY + inset,
    width: icon,
    height: icon,
  });
}

/**
 * Selo compacto: logo IPECC (= QR) + nome 1x + posição livre.
 */
export async function carimbarPdfAssinatura(opts: {
  pdfBytes: Uint8Array | Buffer;
  nome: string;
  cpf: string;
  cargo?: string | null;
  email: string;
  signedAt: Date;
  timezone: string;
  signatureSerial: number;
  validationCode: string;
  placement?: StampPlacement;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(opts.pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const validUrl = new URL(
    `/validar/${opts.validationCode}`,
    validationBaseUrl()
  ).toString();
  const qrPng = await QRCode.toBuffer(validUrl, {
    type: "png",
    width: SELO_SIDE_PT * 4,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0059bf", light: "#00000000" },
  });
  const qrImage = await pdf.embedPng(qrPng);

  let logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  const logoBuf = await carregarLogoPng();
  if (logoBuf) {
    logoImage = await pdf.embedPng(logoBuf);
  }

  const placement: StampPlacement = opts.placement || {
    modoPagina: "ultima",
    posicao: "direita",
    zona: "rodape",
  };

  const preset = presetsParaPct(placement.posicao, placement.zona);
  const xPct =
    placement.xPct != null ? clampPct(placement.xPct, preset.xPct) : preset.xPct;
  const yPct =
    placement.yPct != null ? clampPct(placement.yPct, preset.yPct) : preset.yPct;

  let page: PDFPage;
  if (placement.modoPagina === "nova") {
    page = pdf.addPage([595.28, 841.89]);
    page.drawText("Folha de assinatura — IPECC", {
      x: 48,
      y: 800,
      size: 10,
      font: fontBold,
      color: COR.titulo,
    });
  } else {
    const pages = pdf.getPages();
    if (pages.length === 0) {
      page = pdf.addPage([595.28, 841.89]);
    } else if (placement.modoPagina === "numero" && placement.pagina) {
      const idx =
        Math.min(Math.max(placement.pagina, 1), pages.length) - 1;
      page = pages[idx]!;
    } else {
      page = pages[pages.length - 1]!;
    }
  }

  desenharSelo({
    page,
    font,
    fontBold,
    nome: opts.nome,
    cpf: opts.cpf,
    cargo: opts.cargo,
    signedAt: opts.signedAt,
    timezone: opts.timezone,
    validationCode: opts.validationCode,
    qrImage,
    logoImage,
    xPct,
    yPct,
  });

  return pdf.save();
}
