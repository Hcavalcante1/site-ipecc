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
 * Selo compacto (menor, não o carimbo grande do visualizador).
 * Logo e QR usam exatamente o mesmo lado (pt).
 */
export const SELO_SIDE_PT = 28;
export const SELO_PAD_PT = 4;
/** Largura da coluna central — cabe Lei + código completo sem invadir logo/QR. */
export const SELO_TEXT_W_PT = 148;

/** Proporções do selo na página A4 (para prévia no admin). */
export function seloBoxPts(): { boxW: number; boxH: number } {
  const side = SELO_SIDE_PT;
  const pad = SELO_PAD_PT;
  const textW = SELO_TEXT_W_PT;
  return {
    boxW: side + pad + textW + pad + side + pad,
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
      const px = SELO_SIDE_PT * 4;
      // Remove margem vazia do PNG e preenche o quadrado (= QR)
      return await sharp(p)
        .trim()
        .resize(px, px, {
          fit: "cover",
          position: "centre",
        })
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
  const textW = SELO_TEXT_W_PT;
  const pad = SELO_PAD_PT;
  const { boxW, boxH } = seloBoxPts();
  const { x, y } = origemLivre(width, height, boxW, boxH, opts.xPct, opts.yPct);

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    opacity: 0.97,
    borderColor: COR.borda,
    borderWidth: 0.4,
  });

  // Logo e QR: mesmo quadrado
  if (opts.logoImage) {
    page.drawImage(opts.logoImage, {
      x: x + pad,
      y: y + pad,
      width: side,
      height: side,
    });
  } else {
    page.drawRectangle({
      x: x + pad,
      y: y + pad,
      width: side,
      height: side,
      borderColor: COR.faixa,
      borderWidth: 0.7,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText("IPECC", {
      x: x + pad + 4,
      y: y + pad + side / 2 - 2.5,
      size: 6,
      font: fontBold,
      color: COR.faixa,
    });
  }

  // Coluna de texto estritamente entre logo e QR (centralizada na vertical)
  const tx = x + pad + side + pad;
  const maxTextW = textW - 1;
  const codigo = String(opts.validationCode || "").trim();
  const linhas: {
    text: string;
    size: number;
    bold?: boolean;
    color: typeof COR.corpo;
  }[] = [
    {
      text: caberTexto("Documento assinado digitalmente", font, 5, maxTextW),
      size: 5,
      color: COR.corpo,
    },
    {
      text: caberTexto(nome.toUpperCase(), fontBold, 6.2, maxTextW),
      size: 6.2,
      bold: true,
      color: COR.titulo,
    },
    {
      text: caberTexto(
        `Data: ${formatarDataSimples(opts.signedAt, opts.timezone)}`,
        font,
        4.8,
        maxTextW
      ),
      size: 4.8,
      color: COR.corpo,
    },
    {
      text: caberTexto(
        cargo ? `${cargo} · CPF ${cpfFmt}` : `CPF ${cpfFmt}`,
        font,
        4.6,
        maxTextW
      ),
      size: 4.6,
      color: COR.corpo,
    },
    {
      // Completo e discreto — sem URL; QR leva à validação
      text: caberTexto(`Lei 14.063/2020 · ${codigo}`, font, 4, maxTextW),
      size: 4,
      color: COR.faixa,
    },
  ];

  const lineGap = 1.35;
  const blockH = linhas.reduce((acc, l) => acc + l.size + lineGap, 0) - lineGap;
  let cursorY = y + (boxH + blockH) / 2;

  for (const linha of linhas) {
    cursorY -= linha.size;
    page.drawText(linha.text, {
      x: tx,
      y: cursorY,
      size: linha.size,
      font: linha.bold ? fontBold : font,
      color: linha.color,
    });
    cursorY -= lineGap;
  }

  page.drawImage(opts.qrImage, {
    x: x + boxW - pad - side,
    y: y + pad,
    width: side,
    height: side,
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

  const validUrl = `${validationBaseUrl()}/validar/${opts.validationCode}`;
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
