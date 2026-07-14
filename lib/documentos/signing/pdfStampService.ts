import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { validationBaseUrl } from "./constants";

/** Horizontal — alinhamento do selo. */
export type PosicaoAssinatura =
  | "esquerda"
  | "centro"
  | "direita"
  /** Legado UI (mapeado para vertical=rodape) */
  | "rodape_esquerda"
  | "rodape_centro"
  | "rodape_direita";

export type ZonaVerticalAssinatura = "topo" | "meio" | "rodape";

export type ModoPaginaAssinatura = "ultima" | "numero" | "nova";

export type StampPlacement = {
  modoPagina: ModoPaginaAssinatura;
  /** 1-based quando modoPagina=numero */
  pagina?: number;
  posicao: PosicaoAssinatura;
  /** Onde na página (padrão: rodape para compatibilidade). */
  zona?: ZonaVerticalAssinatura;
};

const COR = {
  faixa: rgb(0.0, 0.36, 0.75), // azul institucional (eco gov.br)
  accent: rgb(0.0, 0.6, 0.35),
  fundo: rgb(1, 1, 1),
  borda: rgb(0.78, 0.82, 0.86),
  titulo: rgb(0.12, 0.14, 0.16),
  corpo: rgb(0.28, 0.3, 0.33),
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
    // Modelo gov.br: Data: 03/03/2023 08:54:40 -0300
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

function normalizarPosicao(pos: PosicaoAssinatura): {
  h: "esquerda" | "centro" | "direita";
  zonaDefault: ZonaVerticalAssinatura;
} {
  if (pos === "rodape_esquerda") return { h: "esquerda", zonaDefault: "rodape" };
  if (pos === "rodape_centro") return { h: "centro", zonaDefault: "rodape" };
  if (pos === "rodape_direita") return { h: "direita", zonaDefault: "rodape" };
  return { h: pos, zonaDefault: "rodape" };
}

function origemBloco(
  pageWidth: number,
  pageHeight: number,
  posicao: PosicaoAssinatura,
  zona: ZonaVerticalAssinatura,
  boxW: number,
  boxH: number
): { x: number; y: number } {
  const marginX = 40;
  const marginY = 36;
  const { h } = normalizarPosicao(posicao);

  let x = marginX;
  if (h === "direita") x = Math.max(marginX, pageWidth - marginX - boxW);
  else if (h === "centro") x = Math.max(marginX, (pageWidth - boxW) / 2);

  let y = marginY;
  if (zona === "topo") y = pageHeight - marginY - boxH;
  else if (zona === "meio") y = (pageHeight - boxH) / 2;

  return { x, y };
}

/**
 * Layout próximo ao selo gov.br:
 * [marca] Documento assinado digitalmente
 *         NOME
 *         Data: …
 *         Verifique em …
 * Nome aparece uma única vez. Marca IPECC (não usa logo gov.br).
 */
function desenharSeloGovBrLike(opts: {
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
  zona: ZonaVerticalAssinatura;
}) {
  const { page, font, fontBold } = opts;
  const { width, height } = page.getSize();
  const nome = opts.nome.trim();
  const cargo = String(opts.cargo || "").trim();
  const cpfFmt = formatarCpfExibicao(opts.cpf);

  const marcaW = 42;
  const qrSize = 34;
  const textW = 175;
  const pad = 6;
  const boxW = marcaW + pad + textW + 4 + qrSize + pad;
  const boxH = 58;
  const { x, y } = origemBloco(
    width,
    height,
    opts.posicao,
    opts.zona,
    boxW,
    boxH
  );

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    opacity: 0.94,
    borderColor: COR.borda,
    borderWidth: 0.45,
  });

  // Marca IPECC (eco do bloco logo do gov.br — sem copiar a marca oficial)
  page.drawRectangle({
    x: x + 4,
    y: y + 16,
    width: marcaW - 6,
    height: 26,
    color: rgb(0.97, 0.98, 1),
    borderColor: COR.faixa,
    borderWidth: 0.6,
  });
  page.drawText("IPECC", {
    x: x + 8,
    y: y + 30,
    size: 7,
    font: fontBold,
    color: COR.faixa,
  });
  page.drawRectangle({
    x: x + 12,
    y: y + 20,
    width: 4,
    height: 4,
    color: rgb(0.95, 0.75, 0.1),
  });
  page.drawRectangle({
    x: x + 18,
    y: y + 20,
    width: 4,
    height: 4,
    color: rgb(0.85, 0.15, 0.15),
  });
  page.drawRectangle({
    x: x + 24,
    y: y + 20,
    width: 4,
    height: 4,
    color: COR.accent,
  });

  const tx = x + marcaW + pad;
  let ty = y + boxH - 11;

  page.drawText("Documento assinado digitalmente", {
    x: tx,
    y: ty,
    size: 6,
    font,
    color: COR.corpo,
  });
  ty -= 10;

  // Nome uma única vez (destaque), como no modelo gov.br
  page.drawText(truncar(nome.toUpperCase(), 34), {
    x: tx,
    y: ty,
    size: 8,
    font: fontBold,
    color: COR.titulo,
  });
  ty -= 9;

  const dataLinha = `Data: ${formatarDataGovBr(opts.signedAt, opts.timezone)}`;
  page.drawText(truncar(dataLinha, 42), {
    x: tx,
    y: ty,
    size: 6,
    font,
    color: COR.corpo,
  });
  ty -= 8;

  // Uma linha só: cargo/CPF miúdo + verificação (sem repetir o nome)
  const extra = cargo
    ? `${truncar(cargo, 18)} · CPF ${cpfFmt}`
    : `CPF ${cpfFmt}`;
  page.drawText(truncar(extra, 42), {
    x: tx,
    y: ty,
    size: 5.5,
    font,
    color: COR.corpo,
  });
  ty -= 7.5;

  // URL curta de verificação (padrão "Verifique em …")
  const verifyHost = validationBaseUrl().replace(/^https?:\/\//, "");
  page.drawText(
    truncar(`Verifique em ${verifyHost}/validar/${opts.validationCode}`, 46),
    {
      x: tx,
      y: ty,
      size: 5.2,
      font,
      color: COR.faixa,
    }
  );

  page.drawImage(opts.qrImage, {
    x: x + boxW - pad - qrSize,
    y: y + (boxH - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });
}

/**
 * Selo visual compacto no modelo gov.br (nome 1x) + QR IPECC.
 * Posicionável no topo / meio / rodapé × esquerda / centro / direita.
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
    width: 88,
    margin: 0,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0059bf",
      light: "#00000000",
    },
  });
  const qrImage = await pdf.embedPng(qrPng);

  const placement: StampPlacement = opts.placement || {
    modoPagina: "ultima",
    posicao: "direita",
    zona: "rodape",
  };

  const { zonaDefault } = normalizarPosicao(placement.posicao);
  const zona = placement.zona || zonaDefault;

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
    page.drawText(
      "Assinatura eletrônica (senha + OTP). Lei 14.063/2020.",
      {
        x: 48,
        y: 784,
        size: 8,
        font,
        color: COR.corpo,
      }
    );
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

  desenharSeloGovBrLike({
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
    zona,
  });

  return pdf.save();
}
