import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DadosEditalParaPdf } from "./types";

function fillPlaceholders(texto: string, dados: DadosEditalParaPdf): string {
  return texto
    .replaceAll("{{titulo}}", dados.titulo || "—")
    .replaceAll("{{tipo}}", dados.tipo || "—")
    .replaceAll("{{objeto}}", dados.objeto || "—")
    .replaceAll("{{periodo}}", dados.periodo || "—")
    .replaceAll("{{periodo_envio}}", dados.periodo_envio || "—")
    .replaceAll("{{fase}}", dados.fase || "—")
    .replaceAll("{{data}}", dados.data || "—")
    .replaceAll("{{propostas}}", dados.propostas || "Nenhuma proposta listada.");
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** Gera PDF A4 institucional a partir do modelo textual. */
export async function renderPdfOficial(opts: {
  tituloModelo: string;
  corpoTemplate: string;
  dados: DadosEditalParaPdf;
}): Promise<Uint8Array> {
  const corpo = fillPlaceholders(opts.corpoTemplate, opts.dados);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidthChars = 90;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawWrapped = (
    text: string,
    size: number,
    bold = false,
    color = rgb(0.1, 0.1, 0.12)
  ) => {
    const f = bold ? fontBold : font;
    for (const raw of text.split(/\n/)) {
      const lines = wrapLine(raw.trimEnd() || " ", maxWidthChars);
      for (const line of lines) {
        ensureSpace(size + 6);
        page.drawText(line, {
          x: margin,
          y,
          size,
          font: f,
          color,
        });
        y -= size + 4;
      }
    }
  };

  drawWrapped("INSTITUTO PAULISTA DE ESTUDOS, CULTURA E CIDADANIA — IPECC", 10, true);
  y -= 6;
  drawWrapped(opts.tituloModelo, 14, true);
  y -= 10;
  drawWrapped(`Documento gerado em ${opts.dados.data}`, 9, false, rgb(0.35, 0.35, 0.4));
  y -= 14;
  drawWrapped(corpo, 10);

  y -= 20;
  ensureSpace(40);
  drawWrapped(
    "— Assinatura eletrônica institucional (Documento) antes da publicação pública —",
    8,
    false,
    rgb(0.4, 0.4, 0.45)
  );

  return pdf.save();
}
