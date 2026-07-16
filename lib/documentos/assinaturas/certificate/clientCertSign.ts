/**
 * Assinatura com certificado no navegador.
 * A chave privada do .pfx/.p12 NUNCA sai do computador.
 */
"use client";

import forge from "node-forge";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type LoadedCertificate = {
  privateKeyPem: string;
  certificatePem: string;
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  thumbprintSha256: string;
};

export type AppearanceOptions = {
  page: number; // 1-based
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  signerLabel?: string;
};

function abToBinary(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function bytesToHex(bytes: forge.util.ByteStringBuffer | string): string {
  const md = forge.md.sha256.create();
  md.update(typeof bytes === "string" ? bytes : bytes.getBytes());
  return md.digest().toHex();
}

export async function loadPfxFromFile(
  file: File,
  password: string
): Promise<LoadedCertificate> {
  const ab = await file.arrayBuffer();
  const binary = abToBinary(ab);
  let p12Asn1: forge.asn1.Asn1;
  try {
    p12Asn1 = forge.asn1.fromDer(binary);
  } catch {
    throw new Error("Arquivo .pfx/.p12 inválido.");
  }

  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  } catch {
    throw new Error("Senha do certificado incorreta ou arquivo corrompido.");
  }

  const bagsKey = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const bagsCert = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBag =
    bagsKey[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0]
      ?.key;
  const certBag = bagsCert[forge.pki.oids.certBag]?.[0]?.cert;

  if (!keyBag || !certBag) {
    throw new Error(
      "Não foi possível extrair chave/certificado do arquivo .pfx."
    );
  }

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag)).getBytes();
  const thumb = bytesToHex(certDer);

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBag),
    certificatePem: forge.pki.certificateToPem(certBag),
    subject: certBag.subject.getField("CN")?.value || certBag.subject.attributes
      .map((a) => `${a.shortName}=${a.value}`)
      .join(", "),
    issuer: certBag.issuer.getField("CN")?.value || certBag.issuer.attributes
      .map((a) => `${a.shortName}=${a.value}`)
      .join(", "),
    serial: certBag.serialNumber,
    notBefore: certBag.validity.notBefore.toISOString(),
    notAfter: certBag.validity.notAfter.toISOString(),
    thumbprintSha256: thumb,
  };
}

function uint8ToBinary(u8: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return s;
}

function binaryToBase64(binary: string): string {
  return forge.util.encode64(binary);
}

function uint8ToBase64(u8: Uint8Array): string {
  return binaryToBase64(uint8ToBinary(u8));
}

async function sha256Hex(u8: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", u8);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Assina o PDF no cliente: carimbo visual na página escolhida + PKCS#7 do hash.
 */
export async function signPdfWithLocalCertificate(opts: {
  pdfBytes: Uint8Array;
  expectedHashSha256: string;
  cert: LoadedCertificate;
  appearance: AppearanceOptions;
}): Promise<{
  signedPdfBase64: string;
  pkcs7Base64: string;
  finalHashSha256: string;
  pageCount: number;
}> {
  const incomingHash = await sha256Hex(opts.pdfBytes);
  if (
    incomingHash.toLowerCase() !==
    String(opts.expectedHashSha256 || "").toLowerCase()
  ) {
    throw new Error(
      "O PDF baixado diverge do hash congelado. Recrie a sessão."
    );
  }

  const pdfDoc = await PDFDocument.load(opts.pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  const pageIndex = Math.min(
    Math.max((opts.appearance.page || pageCount) - 1, 0),
    pageCount - 1
  );
  const page = pdfDoc.getPage(pageIndex);
  const { width: pw, height: ph } = page.getSize();
  const boxW = opts.appearance.width ?? 220;
  const boxH = opts.appearance.height ?? 70;
  const x = opts.appearance.x ?? Math.max(36, pw - boxW - 36);
  const y = opts.appearance.y ?? 36;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.12, 0.25, 0.45),
    borderWidth: 1.2,
    color: rgb(0.93, 0.96, 0.99),
    opacity: 0.95,
  });

  const label = opts.appearance.signerLabel || opts.cert.subject;
  const when = new Date().toLocaleString("pt-BR");
  page.drawText("Assinado digitalmente", {
    x: x + 8,
    y: y + boxH - 16,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.35),
  });
  page.drawText(String(label).slice(0, 42), {
    x: x + 8,
    y: y + boxH - 30,
    size: 8,
    font,
    color: rgb(0.15, 0.2, 0.3),
  });
  page.drawText(when, {
    x: x + 8,
    y: y + boxH - 44,
    size: 7,
    font,
    color: rgb(0.25, 0.3, 0.4),
  });
  page.drawText("Certificado local · chave não enviada", {
    x: x + 8,
    y: y + 10,
    size: 6,
    font,
    color: rgb(0.35, 0.4, 0.5),
  });

  const stamped = await pdfDoc.save({ useObjectStreams: false });
  const stampedU8 = stamped instanceof Uint8Array ? stamped : new Uint8Array(stamped);
  const finalHash = await sha256Hex(stampedU8);

  const privateKey = forge.pki.privateKeyFromPem(opts.cert.privateKeyPem);
  const certificate = forge.pki.certificateFromPem(opts.cert.certificatePem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(uint8ToBinary(stampedU8));
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const p7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const p7U8 = new Uint8Array(p7Der.length);
  for (let i = 0; i < p7Der.length; i++) p7U8[i] = p7Der.charCodeAt(i);

  // Anexa o .p7s como arquivo embutido no PDF (evidência portátil)
  const withAttach = await PDFDocument.load(stampedU8);
  await withAttach.attach(p7U8, "assinatura.p7s", {
    mimeType: "application/pkcs7-signature",
    description: "Assinatura PKCS#7 (detached) do PDF carimbado",
  });
  const finalPdf = await withAttach.save({ useObjectStreams: false });
  const finalU8 = finalPdf instanceof Uint8Array ? finalPdf : new Uint8Array(finalPdf);

  return {
    signedPdfBase64: uint8ToBase64(finalU8),
    pkcs7Base64: binaryToBase64(p7Der),
    finalHashSha256: await sha256Hex(finalU8),
    pageCount,
  };
}

/** Limpa referências sensíveis (melhor esforço). */
export function discardCertificate(cert: LoadedCertificate | null) {
  if (!cert) return;
  (cert as { privateKeyPem: string }).privateKeyPem = "";
  (cert as { certificatePem: string }).certificatePem = "";
}
