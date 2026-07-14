import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { validationBaseUrl } from "./constants";

export type PosicaoAssinatura =
  | "rodape_esquerda"
  | "rodape_centro"
  | "rodape_direita";

export type ModoPaginaAssinatura = "ultima" | "numero" | "nova";

export type StampPlacement = {
  modoPagina: ModoPaginaAssinatura;
  /** 1-based quando modoPagina=numero */
  pagina?: number;
  posicao: PosicaoAssinatura;
};

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

function formatarDadosGovBr(iso: Date, timeZone: string): string {
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
    const y = get("year");
    const m = get("month");
    const d = get("day");
    const h = get("hour");
    const min = get("minute");
    const s = get("second");
    const off = (get("timeZoneName") || "-03").replace("GMT", "");
    let offset = "-03'00'";
    if (/^[+-]\d{2}$/.test(off)) offset = `${off}'00'`;
    else if (/^[+-]\d{2}:\d{2}$/.test(off))
      offset = `${off.slice(0, 3)}'${off.slice(4)}'`;
    return `${y}.${m}.${d} ${h}:${min}:${s} ${offset}`;
  } catch {
    return iso.toISOString();
  }
}

function origemBloco(
  pageWidth: number,
  pageHeight: number,
  posicao: PosicaoAssinatura,
  boxW: number,
  boxH: number
): { x: number; y: number } {
  const marginX = 48;
  const marginBottom = 56;
  const y = marginBottom;
  if (posicao === "rodape_direita") {
    return { x: Math.max(marginX, pageWidth - marginX - boxW), y };
  }
  if (posicao === "rodape_centro") {
    return { x: Math.max(marginX, (pageWidth - boxW) / 2), y };
  }
  return { x: marginX, y };
}

function desenharBlocoGovBr(opts: {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  nome: string;
  cpf: string;
  cargo?: string | null;
  signedAt: Date;
  timezone: string;
  validationCode: string;
  validUrl: string;
  qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  posicao: PosicaoAssinatura;
}) {
  const { page, font, fontBold } = opts;
  const { width, height } = page.getSize();
  const cpfFmt = formatarCpfExibicao(opts.cpf);
  const cpfDigits = soDigitos(opts.cpf);
  const nomeUpper = opts.nome.trim().toUpperCase();
  const idLine = `${nomeUpper}:${cpfDigits}`;
  const assinadoPor = `Assinado de forma digital por ${idLine}`;
  const dados = `Dados: ${formatarDadosGovBr(opts.signedAt, opts.timezone)}`;

  const boxW = 280;
  const qrSize = 64;
  const boxH = 92;
  const { x, y } = origemBloco(width, height, opts.posicao, boxW + qrSize + 12, boxH);

  // Fundo sutil (estilo selo legível, sem “dashboard”)
  page.drawRectangle({
    x: x - 4,
    y: y - 4,
    width: boxW + 8,
    height: boxH + 8,
    color: rgb(1, 1, 1),
    opacity: 0.92,
    borderColor: rgb(0.75, 0.78, 0.82),
    borderWidth: 0.6,
  });

  let ty = y + boxH - 14;
  const ink = rgb(0.05, 0.12, 0.28);
  const muted = rgb(0.25, 0.28, 0.32);

  // Texto no padrão visual gov.br / Adobe Reader
  page.drawText(assinadoPor.slice(0, 78), {
    x,
    y: ty,
    size: 7,
    font: fontBold,
    color: ink,
  });
  ty -= 11;
  page.drawText(dados.slice(0, 78), {
    x,
    y: ty,
    size: 7,
    font,
    color: muted,
  });
  ty -= 14;

  // Linha de assinatura
  page.drawLine({
    start: { x, y: ty },
    end: { x: x + boxW - 8, y: ty },
    thickness: 0.8,
    color: rgb(0.1, 0.1, 0.1),
  });
  ty -= 14;

  page.drawText(opts.nome.trim().slice(0, 48), {
    x,
    y: ty,
    size: 10,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.1),
  });
  ty -= 12;
  if (opts.cargo) {
    page.drawText(String(opts.cargo).trim().slice(0, 48), {
      x,
      y: ty,
      size: 9,
      font,
      color: muted,
    });
    ty -= 11;
  }
  page.drawText(`CPF ${cpfFmt}`, {
    x,
    y: ty,
    size: 8,
    font,
    color: muted,
  });
  ty -= 10;
  page.drawText(`Validação: ${opts.validationCode}`, {
    x,
    y: ty,
    size: 7,
    font,
    color: rgb(0.35, 0.38, 0.42),
  });

  // QR ao lado do bloco
  const qx = x + boxW + 4;
  const qy = y + 8;
  page.drawImage(opts.qrImage, {
    x: Math.min(qx, width - qrSize - 24),
    y: qy,
    width: qrSize,
    height: qrSize,
  });
}

/**
 * Carimbo visual no padrão gov.br / Adobe (“Assinado de forma digital por…”).
 * Não é ICP-Brasil criptográfico; é representação gráfica + QR de validação IPECC.
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
    width: 160,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const qrImage = await pdf.embedPng(qrPng);

  const placement: StampPlacement = opts.placement || {
    modoPagina: "ultima",
    posicao: "rodape_direita",
  };

  let page: PDFPage;
  if (placement.modoPagina === "nova") {
    page = pdf.addPage([595.28, 841.89]);
    // Cabeçalho discreto na página anexa
    page.drawText("Folha de assinatura eletrônica — IPECC", {
      x: 48,
      y: 800,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.28),
    });
    page.drawText(
      "Documento assinado eletronicamente com autenticação (senha + OTP).",
      {
        x: 48,
        y: 782,
        size: 9,
        font,
        color: rgb(0.35, 0.38, 0.42),
      }
    );
  } else {
    const pages = pdf.getPages();
    if (pages.length === 0) {
      page = pdf.addPage([595.28, 841.89]);
    } else if (placement.modoPagina === "numero" && placement.pagina) {
      const idx = Math.min(
        Math.max(placement.pagina, 1),
        pages.length
      ) - 1;
      page = pages[idx]!;
    } else {
      page = pages[pages.length - 1]!;
    }
  }

  desenharBlocoGovBr({
    page,
    font,
    fontBold,
    nome: opts.nome,
    cpf: opts.cpf,
    cargo: opts.cargo,
    signedAt: opts.signedAt,
    timezone: opts.timezone,
    validationCode: opts.validationCode,
    validUrl,
    qrImage,
    posicao: placement.posicao,
  });

  return pdf.save();
}
