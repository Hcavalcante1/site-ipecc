import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { validationBaseUrl } from "./constants";

function formatarDataHora(iso: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      dateStyle: "short",
      timeStyle: "medium",
    }).format(iso);
  } catch {
    return iso.toISOString();
  }
}

/** Insere página de assinatura eletrônica IPECC com QR e código de validação. */
export async function carimbarPdfAssinatura(opts: {
  pdfBytes: Uint8Array | Buffer;
  nome: string;
  cargo?: string | null;
  email: string;
  signedAt: Date;
  timezone: string;
  signatureSerial: number;
  validationCode: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(opts.pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const margin = 50;
  let y = 780;

  const validUrl = `${validationBaseUrl()}/validar/${opts.validationCode}`;
  const qrPng = await QRCode.toBuffer(validUrl, {
    type: "png",
    width: 140,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const qrImage = await pdf.embedPng(qrPng);

  page.drawText("ASSINATURA ELETRÔNICA IPECC", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.08, 0.2, 0.35),
  });
  y -= 28;

  const lines = [
    `Signatário: ${opts.nome}`,
    opts.cargo ? `Cargo: ${opts.cargo}` : null,
    `E-mail: ${opts.email}`,
    `Data/hora: ${formatarDataHora(opts.signedAt, opts.timezone)} (${opts.timezone})`,
    `Nº da assinatura: ${opts.signatureSerial}`,
    `Código de validação: ${opts.validationCode}`,
    `Validar em: ${validUrl}`,
  ].filter(Boolean) as string[];

  for (const line of lines) {
    page.drawText(line.slice(0, 95), {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.12, 0.12, 0.14),
    });
    y -= 16;
  }

  y -= 12;
  page.drawText(
    "Documento assinado eletronicamente com evidências registradas (senha + OTP).",
    {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.32),
    }
  );

  page.drawImage(qrImage, {
    x: 595.28 - margin - 140,
    y: 60,
    width: 140,
    height: 140,
  });

  page.drawText("QR Code de validação", {
    x: 595.28 - margin - 140,
    y: 48,
    size: 8,
    font,
    color: rgb(0.35, 0.35, 0.38),
  });

  return pdf.save();
}
