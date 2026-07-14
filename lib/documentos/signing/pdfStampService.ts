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

/** Cores institucionais suaves (selo compacto, sem poluir o texto). */
const COR = {
  faixa: rgb(0.05, 0.35, 0.42), // teal institucional
  fundo: rgb(0.965, 0.98, 0.985),
  borda: rgb(0.72, 0.82, 0.84),
  titulo: rgb(0.06, 0.18, 0.26),
  corpo: rgb(0.22, 0.28, 0.32),
  legal: rgb(0.4, 0.46, 0.5),
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

function truncar(texto: string, max: number): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function origemBloco(
  pageWidth: number,
  posicao: PosicaoAssinatura,
  boxW: number
): { x: number; y: number } {
  const marginX = 42;
  const marginBottom = 36;
  const y = marginBottom;
  if (posicao === "rodape_direita") {
    return { x: Math.max(marginX, pageWidth - marginX - boxW), y };
  }
  if (posicao === "rodape_centro") {
    return { x: Math.max(marginX, (pageWidth - boxW) / 2), y };
  }
  return { x: marginX, y };
}

/**
 * Selo compacto no espírito Adobe/gov.br:
 * faixa colorida + 3–4 linhas + QR pequeno.
 * Base legal em tipografia mínima (Lei 14.063/2020), sem bloco burocrático.
 */
function desenharBlocoCompacto(opts: {
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
  posicao: PosicaoAssinatura;
}) {
  const { page, font, fontBold } = opts;
  const { width } = page.getSize();
  const cpfFmt = formatarCpfExibicao(opts.cpf);
  const cpfDigits = soDigitos(opts.cpf);
  const nome = opts.nome.trim();
  const cargo = String(opts.cargo || "").trim();

  const qrSize = 38;
  const faixaW = 3.2;
  const pad = 6;
  const textW = 168;
  const boxW = faixaW + pad + textW + 6 + qrSize + pad;
  const boxH = 52;
  const { x, y } = origemBloco(width, opts.posicao, boxW);

  // Fundo + borda leve
  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: COR.fundo,
    borderColor: COR.borda,
    borderWidth: 0.5,
  });

  // Faixa institucional (lado esquerdo)
  page.drawRectangle({
    x,
    y,
    width: faixaW,
    height: boxH,
    color: COR.faixa,
  });

  const tx = x + faixaW + pad;
  let ty = y + boxH - 11;

  // Linha 1 — padrão gov.br / Adobe
  page.drawText(
    truncar(`Assinado de forma digital por ${nome.toUpperCase()}:${cpfDigits}`, 46),
    {
      x: tx,
      y: ty,
      size: 5.8,
      font: fontBold,
      color: COR.titulo,
    }
  );
  ty -= 8.2;

  // Linha 2 — data
  page.drawText(
    truncar(`Dados: ${formatarDadosGovBr(opts.signedAt, opts.timezone)}`, 48),
    {
      x: tx,
      y: ty,
      size: 5.5,
      font,
      color: COR.corpo,
    }
  );
  ty -= 8;

  // Linha 3 — nome civil + cargo (identidade legível)
  const idLinha = cargo
    ? `${truncar(nome, 28)} · ${truncar(cargo, 16)}`
    : truncar(nome, 42);
  page.drawText(idLinha, {
    x: tx,
    y: ty,
    size: 6.5,
    font: fontBold,
    color: COR.titulo,
  });
  ty -= 8;

  // Linha 4 — CPF + legal mínima + código
  page.drawText(
    truncar(
      `CPF ${cpfFmt} · Lei 14.063/2020 · ${opts.validationCode}`,
      50
    ),
    {
      x: tx,
      y: ty,
      size: 5.2,
      font,
      color: COR.legal,
    }
  );

  // QR mínimo à direita
  page.drawImage(opts.qrImage, {
    x: x + boxW - pad - qrSize,
    y: y + (boxH - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });
}

/**
 * Carimbo visual compacto (estilo gov.br) + QR de validação IPECC.
 * Ilustrativo: a força jurídica está nas evidências / hash / OTP (Lei 14.063/2020).
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
    width: 96,
    margin: 0,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0d3d4a",
      light: "#00000000",
    },
  });
  const qrImage = await pdf.embedPng(qrPng);

  const placement: StampPlacement = opts.placement || {
    modoPagina: "ultima",
    posicao: "rodape_direita",
  };

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
      "Assinatura eletrônica com autenticação (senha + OTP). Lei 14.063/2020.",
      {
        x: 48,
        y: 784,
        size: 8,
        font,
        color: COR.legal,
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

  desenharBlocoCompacto({
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
    posicao: placement.posicao,
  });

  return pdf.save();
}
