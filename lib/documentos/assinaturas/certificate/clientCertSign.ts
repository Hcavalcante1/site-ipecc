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

/** Dimensões do carimbo visual (pt) — preview e PDF usam o mesmo. */
export const CERT_STAMP_BOX = { w: 220, h: 70, margin: 18 };

export type AppearanceOptions = {
  page: number; // 1-based
  /** 0–100: esquerda→direita (preferencial, igual à assinatura simples). */
  xPct?: number;
  /** 0–100: topo→rodapé. */
  yPct?: number;
  /** Coordenadas PDF absolutas (fallback se xPct/yPct ausentes). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  signerLabel?: string;
};

function clampPct(n: number, fallback: number): number {
  const v = Number.isFinite(n) ? n : fallback;
  return Math.min(100, Math.max(0, v));
}

/** Mesma matemática de `origemLivre` (pdfStampService). */
export function certStampOrigin(
  pageWidth: number,
  pageHeight: number,
  boxW: number,
  boxH: number,
  xPct: number,
  yPct: number
): { x: number; y: number } {
  const margin = CERT_STAMP_BOX.margin;
  const spanX = Math.max(0, pageWidth - boxW - 2 * margin);
  const spanY = Math.max(0, pageHeight - boxH - 2 * margin);
  const x = margin + (spanX * clampPct(xPct, 96)) / 100;
  const y =
    pageHeight - boxH - margin - (spanY * clampPct(yPct, 96)) / 100;
  return { x, y };
}

/** Converte bytes → string binária sem spread (evita Maximum call stack). */
function uint8ToBinary(u8: Uint8Array): string {
  const chunkSize = 0x2000;
  let out = "";
  for (let i = 0; i < u8.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, u8.length);
    let part = "";
    for (let j = i; j < end; j++) {
      part += String.fromCharCode(u8[j]);
    }
    out += part;
  }
  return out;
}

function binaryToUint8(binary: string): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xff;
  return out;
}

function abToBinary(buf: ArrayBuffer): string {
  return uint8ToBinary(new Uint8Array(buf));
}

function bytesToHex(bytes: string): string {
  const md = forge.md.sha256.create();
  md.update(bytes);
  return md.digest().toHex();
}

function attrValue(attrs: forge.pki.CertificateField[], shortName: string): string {
  const hit = attrs.find((a) => a.shortName === shortName || a.name === shortName);
  return hit ? String(hit.value || "") : "";
}

function formatDn(cert: forge.pki.Certificate, which: "subject" | "issuer"): string {
  const attrs =
    which === "subject" ? cert.subject.attributes : cert.issuer.attributes;
  const cn = attrValue(attrs, "CN");
  if (cn) return cn;
  return attrs.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ");
}

function bagAttrHex(
  bag: forge.pkcs12.Bag | undefined,
  name: string
): string | null {
  const raw = bag?.attributes?.[name]?.[0];
  if (!raw) return null;
  if (typeof raw === "string") {
    return bytesToHex(raw);
  }
  if (raw && typeof raw === "object" && "charCodeAt" in raw) {
    return bytesToHex(String(raw));
  }
  return null;
}

function certIsCa(cert: forge.pki.Certificate): boolean {
  const bc = cert.getExtension("basicConstraints") as
    | { cA?: boolean }
    | undefined;
  return Boolean(bc?.cA);
}

function certScoreForSigning(
  cert: forge.pki.Certificate,
  keyIdHex: string | null,
  certBag?: forge.pkcs12.Bag
): number {
  let score = 0;
  const certKeyIdHex = bagAttrHex(certBag, "localKeyId");
  if (keyIdHex && certKeyIdHex && keyIdHex === certKeyIdHex) score += 1000;
  if (!certIsCa(cert)) score += 100;

  const ku = cert.getExtension("keyUsage") as
    | {
        digitalSignature?: boolean;
        nonRepudiation?: boolean;
        keyEncipherment?: boolean;
      }
    | undefined;
  if (ku?.digitalSignature) score += 40;
  if (ku?.nonRepudiation) score += 30;
  if (ku?.keyEncipherment) score += 10;

  const eku = cert.getExtension("extKeyUsage") as
    | Record<string, boolean>
    | undefined;
  if (eku?.emailProtection) score += 10;
  if (eku?.clientAuth) score += 10;

  const subjectCn = attrValue(cert.subject.attributes, "CN");
  const issuerCn = attrValue(cert.issuer.attributes, "CN");
  if (subjectCn && subjectCn !== issuerCn) score += 5;

  const now = Date.now();
  if (cert.validity.notBefore.getTime() <= now) score += 3;
  if (cert.validity.notAfter.getTime() > now) score += 3;
  return score;
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
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  } catch {
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch {
      throw new Error("Senha do certificado incorreta ou arquivo corrompido.");
    }
  }

  const bagsKey =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] || [];
  const bagsKeyPlain =
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ||
    [];
  const bagsCert =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ||
    [];

  const keyBagEntry = bagsKey[0] || bagsKeyPlain[0] || null;
  const keyBag = keyBagEntry?.key || null;
  const keyIdHex = bagAttrHex(keyBagEntry || undefined, "localKeyId");

  let certBagEntry =
    bagsCert
      .filter((b) => b?.cert)
      .sort(
        (a, b) =>
          certScoreForSigning(b.cert, keyIdHex, b) -
          certScoreForSigning(a.cert, keyIdHex, a)
      )[0] || null;
  const certBag = certBagEntry?.cert || null;

  if (!keyBag || !certBag) {
    throw new Error(
      "Não foi possível extrair chave/certificado do arquivo .pfx. Use um certificado A1 (.pfx) com chave RSA."
    );
  }

  let privateKeyPem: string;
  let certificatePem: string;
  try {
    privateKeyPem = forge.pki.privateKeyToPem(keyBag);
    certificatePem = forge.pki.certificateToPem(certBag);
  } catch {
    throw new Error(
      "Este certificado usa um tipo de chave não suportado no navegador. Use um .pfx A1 com RSA."
    );
  }

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag)).getBytes();
  const thumb = bytesToHex(certDer);

  const now = new Date();
  if (certBag.validity.notAfter < now) {
    throw new Error("Este certificado está vencido.");
  }
  if (certBag.validity.notBefore > now) {
    throw new Error("Este certificado ainda não é válido.");
  }

  return {
    privateKeyPem,
    certificatePem,
    subject: formatDn(certBag, "subject"),
    issuer: formatDn(certBag, "issuer"),
    serial: certBag.serialNumber,
    notBefore: certBag.validity.notBefore.toISOString(),
    notAfter: certBag.validity.notAfter.toISOString(),
    thumbprintSha256: thumb,
  };
}

async function sha256Hex(u8: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", u8);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function createDetachedPkcs7(
  contentBytes: Uint8Array,
  privateKeyPem: string,
  certificatePem: string
): Uint8Array {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(certificatePem);

  // Assina o digest SHA-256 do PDF (conteúdo pequeno e estável no browser).
  const md = forge.md.sha256.create();
  md.update(uint8ToBinary(contentBytes));
  const digestBinary = md.digest().getBytes();

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(digestBinary);
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
  return binaryToUint8(p7Der);
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
  signedPdfBytes: Uint8Array;
  pkcs7Bytes: Uint8Array;
  finalHashSha256: string;
  pageCount: number;
}> {
  if (opts.pdfBytes.length < 5) {
    throw new Error("PDF baixado está vazio ou inválido.");
  }
  const head = String.fromCharCode(
    opts.pdfBytes[0],
    opts.pdfBytes[1],
    opts.pdfBytes[2],
    opts.pdfBytes[3]
  );
  if (head !== "%PDF") {
    throw new Error(
      "O download não retornou um PDF. Verifique permissões e tente novamente."
    );
  }

  const incomingHash = await sha256Hex(opts.pdfBytes);
  if (
    incomingHash.toLowerCase() !==
    String(opts.expectedHashSha256 || "").toLowerCase()
  ) {
    throw new Error(
      "O PDF baixado diverge do hash congelado. Recrie a sessão e tente de novo."
    );
  }

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(opts.pdfBytes, { ignoreEncryption: true });
  } catch {
    throw new Error(
      "Não foi possível abrir o PDF (pode estar criptografado ou corrompido)."
    );
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount < 1) {
    throw new Error("PDF sem páginas.");
  }
  const pageIndex = Math.min(
    Math.max((opts.appearance.page || pageCount) - 1, 0),
    pageCount - 1
  );
  const page = pdfDoc.getPage(pageIndex);
  const { width: pw, height: ph } = page.getSize();
  const boxW = opts.appearance.width ?? CERT_STAMP_BOX.w;
  const boxH = opts.appearance.height ?? CERT_STAMP_BOX.h;
  let x: number;
  let y: number;
  if (
    opts.appearance.xPct != null &&
    opts.appearance.yPct != null &&
    Number.isFinite(opts.appearance.xPct) &&
    Number.isFinite(opts.appearance.yPct)
  ) {
    const o = certStampOrigin(
      pw,
      ph,
      boxW,
      boxH,
      opts.appearance.xPct,
      opts.appearance.yPct
    );
    x = o.x;
    y = o.y;
  } else {
    x = opts.appearance.x ?? Math.max(36, pw - boxW - 36);
    y = opts.appearance.y ?? 36;
  }
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
  const stampedU8 =
    stamped instanceof Uint8Array ? stamped : new Uint8Array(stamped);

  let pkcs7Bytes: Uint8Array;
  try {
    pkcs7Bytes = createDetachedPkcs7(
      stampedU8,
      opts.cert.privateKeyPem,
      opts.cert.certificatePem
    );
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Falha ao gerar PKCS#7: ${e.message}`
        : "Falha ao gerar a assinatura criptográfica."
    );
  }

  // Anexar .p7s é opcional — se falhar, mantém o PDF carimbado.
  let finalU8 = stampedU8;
  try {
    const withAttach = await PDFDocument.load(stampedU8);
    await withAttach.attach(pkcs7Bytes, "assinatura.p7s", {
      mimeType: "application/pkcs7-signature",
      description: "Assinatura PKCS#7 (detached) do PDF carimbado",
    });
    const finalPdf = await withAttach.save({ useObjectStreams: false });
    finalU8 =
      finalPdf instanceof Uint8Array ? finalPdf : new Uint8Array(finalPdf);
  } catch {
    finalU8 = stampedU8;
  }

  return {
    signedPdfBytes: finalU8,
    pkcs7Bytes,
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
