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
  fundo: rgb(1, 1, 1),
  borda: rgb(0.78, 0.82, 0.86),
  titulo: rgb(0.12, 0.14, 0.16),
  corpo: rgb(0.28, 0.3, 0.33),
};

const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public", "media", "global", "logos", "ipecc_logo_v2.png"),
  path.join(process.cwd(), "public", "logo-apecc.svg"),
];

/** Tamanho único logo = QR (coesão visual). */
const SELO_SIDE = 40;

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

function formatarDataGovBr(iso: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    }).formatToParts(iso);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const d = get("day");
    const m = get("month");
    const y = get("year");
    const h = get("hour");
    const min = get("minute");
    const s = get("second");
    const off = (get("timeZoneName") || "-03").replace("GMT", "");
    let offset = "-0300";
    if (/^[+-]\d{2}$/.test(off)) offset = `${off}00`;
    else if (/^[+-]\d{2}:\d{2}$/.test(off))
      offset = `${off.slice(0, 3)}${off.slice(4)}`;
    return `${d}/${m}/${y} ${h}:${min}:${s} ${offset}`;
  } catch {
    return iso.toISOString();
  }
}

function truncar(texto: string, max: number): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
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

  const xPct = h === "esquerda" ? 4 : h === "centro" ? 50 : 96;
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
  const margin = 24;
  const spanX = Math.max(0, pageWidth - boxW - 2 * margin);
  const spanY = Math.max(0, pageHeight - boxH - 2 * margin);
  // 0 = esquerda / topo; 100 = direita / rodapé
  const x = margin + (spanX * clampPct(xPct, 50)) / 100;
  const y = pageHeight - boxH - margin - (spanY * clampPct(yPct, 96)) / 100;
  return { x, y };
}

async function carregarLogoPng(): Promise<Buffer | null> {
  for (const p of LOGO_CANDIDATES) {
    if (!fs.existsSync(p) || !p.endsWith(".png")) continue;
    try {
      // Reduz peso no PDF; mantém nitidez no tamanho do QR
      return await sharp(p)
        .resize(SELO_SIDE * 3, SELO_SIDE * 3, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
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

  const side = SELO_SIDE;
  const textW = 168;
  const pad = 6;
  const boxW = side + pad + textW + pad + side + pad;
  const boxH = side + pad * 2;
  const { x, y } = origemLivre(width, height, boxW, boxH, opts.xPct, opts.yPct);

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    opacity: 0.96,
    borderColor: COR.borda,
    borderWidth: 0.45,
  });

  // Logo = mesmo tamanho do QR
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
      borderWidth: 0.8,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText("IPECC", {
      x: x + pad + 6,
      y: y + pad + side / 2 - 3,
      size: 7,
      font: fontBold,
      color: COR.faixa,
    });
  }

  const tx = x + pad + side + pad;
  let ty = y + boxH - 12;

  page.drawText("Documento assinado digitalmente", {
    x: tx,
    y: ty,
    size: 6,
    font,
    color: COR.corpo,
  });
  ty -= 10;

  page.drawText(truncar(nome.toUpperCase(), 32), {
    x: tx,
    y: ty,
    size: 8,
    font: fontBold,
    color: COR.titulo,
  });
  ty -= 9;

  page.drawText(
    truncar(`Data: ${formatarDataGovBr(opts.signedAt, opts.timezone)}`, 40),
    {
      x: tx,
      y: ty,
      size: 6,
      font,
      color: COR.corpo,
    }
  );
  ty -= 8;

  const extra = cargo
    ? `${truncar(cargo, 16)} · CPF ${cpfFmt}`
    : `CPF ${cpfFmt}`;
  page.drawText(truncar(extra, 40), {
    x: tx,
    y: ty,
    size: 5.5,
    font,
    color: COR.corpo,
  });
  ty -= 7.5;

  const verifyHost = validationBaseUrl().replace(/^https?:\/\//, "");
  page.drawText(
    truncar(`Verifique em ${verifyHost}/validar/${opts.validationCode}`, 44),
    {
      x: tx,
      y: ty,
      size: 5.2,
      font,
      color: COR.faixa,
    }
  );

  page.drawImage(opts.qrImage, {
    x: x + boxW - pad - side,
    y: y + pad,
    width: side,
    height: side,
  });
}

/**
 * Selo gov.br-like: logo IPECC original (= QR) + nome 1x + posição livre na página.
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
    width: SELO_SIDE * 3,
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
