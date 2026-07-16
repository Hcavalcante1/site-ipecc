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
  /** Cadeia completa (titular + intermediários), como o Adobe embute. */
  chainPem: string[];
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

function sha256HexOfBinary(bytes: string): string {
  const md = forge.md.sha256.create();
  md.update(bytes);
  return md.digest().toHex();
}

function attrValue(attrs: forge.pki.CertificateField[], shortName: string): string {
  const hit = attrs.find((a) => a.shortName === shortName || a.name === shortName);
  return hit ? String(hit.value || "") : "";
}

/** Nome legível no estilo Adobe (CN completo; se ICP-Brasil, mantém NOME:CPF). */
function formatDn(cert: forge.pki.Certificate, which: "subject" | "issuer"): string {
  const attrs =
    which === "subject" ? cert.subject.attributes : cert.issuer.attributes;
  const cn = attrValue(attrs, "CN");
  if (cn) return cn;
  return attrs.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ");
}

function bagAttrBytes(
  bag: forge.pkcs12.Bag | undefined,
  name: string
): string | null {
  const raw = bag?.attributes?.[name]?.[0];
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  return String(raw);
}

function bagAttrHex(
  bag: forge.pkcs12.Bag | undefined,
  name: string
): string | null {
  const bytes = bagAttrBytes(bag, name);
  if (bytes == null) return null;
  try {
    return forge.util.bytesToHex(bytes);
  } catch {
    return null;
  }
}

function bagFriendlyName(bag: forge.pkcs12.Bag | undefined): string | null {
  const raw = bagAttrBytes(bag, "friendlyName");
  if (!raw) return null;
  const cleaned = raw.replace(/\0/g, "").trim();
  return cleaned || null;
}

function certIsCa(cert: forge.pki.Certificate): boolean {
  const bc = cert.getExtension("basicConstraints") as
    | { cA?: boolean }
    | undefined;
  return Boolean(bc?.cA);
}

/**
 * Critério do Adobe/OpenSSL: o certificado do titular é o que casa com a
 * chave privada (mesmo módulo RSA / mesma chave pública).
 */
function privateKeyMatchesCertificate(
  privateKey: forge.pki.PrivateKey,
  cert: forge.pki.Certificate
): boolean {
  try {
    const pub = cert.publicKey as {
      n?: { compareTo: (o: unknown) => number; toString: (r?: number) => string };
      e?: { compareTo: (o: unknown) => number; toString: (r?: number) => string };
    };
    const priv = privateKey as {
      n?: { compareTo: (o: unknown) => number; toString: (r?: number) => string };
      e?: { compareTo: (o: unknown) => number; toString: (r?: number) => string };
    };
    if (priv.n && pub.n && priv.e && pub.e) {
      return priv.n.compareTo(pub.n) === 0 && priv.e.compareTo(pub.e) === 0;
    }
    return false;
  } catch {
    return false;
  }
}

function pickSignerCertificate(
  privateKey: forge.pki.PrivateKey,
  keyBag: forge.pkcs12.Bag | undefined,
  certBags: forge.pkcs12.Bag[]
): { cert: forge.pki.Certificate; bag: forge.pkcs12.Bag } | null {
  const withCert = certBags.filter((b) => b?.cert);
  if (!withCert.length) return null;

  const keyIdHex = bagAttrHex(keyBag, "localKeyId");

  // 1) Adobe/OpenSSL: casa pela chave pública
  const byPubKey = withCert.filter((b) =>
    privateKeyMatchesCertificate(privateKey, b.cert!)
  );
  if (byPubKey.length === 1) {
    return { cert: byPubKey[0].cert!, bag: byPubKey[0] };
  }
  if (byPubKey.length > 1) {
    const nonCa = byPubKey.find((b) => !certIsCa(b.cert!));
    const chosen = nonCa || byPubKey[0];
    return { cert: chosen.cert!, bag: chosen };
  }

  // 2) localKeyId idêntico ao da chave privada
  if (keyIdHex) {
    const byId = withCert.find((b) => bagAttrHex(b, "localKeyId") === keyIdHex);
    if (byId?.cert) return { cert: byId.cert, bag: byId };
  }

  // 3) Certificado de usuário (-clcerts): tem localKeyId e não é CA
  const clientLike = withCert.filter(
    (b) => bagAttrHex(b, "localKeyId") && !certIsCa(b.cert!)
  );
  if (clientLike.length === 1) {
    return { cert: clientLike[0].cert!, bag: clientLike[0] };
  }

  // 4) Último recurso: não-CA válido agora
  const now = Date.now();
  const endEntity = withCert
    .filter((b) => !certIsCa(b.cert!))
    .filter(
      (b) =>
        b.cert!.validity.notBefore.getTime() <= now &&
        b.cert!.validity.notAfter.getTime() > now
    );
  if (endEntity.length >= 1) {
    return { cert: endEntity[0].cert!, bag: endEntity[0] };
  }

  return withCert[0]?.cert
    ? { cert: withCert[0].cert, bag: withCert[0] }
    : null;
}

function buildCertificateChain(
  leaf: forge.pki.Certificate,
  all: forge.pki.Certificate[]
): forge.pki.Certificate[] {
  const chain: forge.pki.Certificate[] = [leaf];
  const pool = all.filter((c) => c !== leaf);
  let current = leaf;
  for (let i = 0; i < 8; i++) {
    const issuerCn = formatDn(current, "issuer");
    const subjectCn = formatDn(current, "subject");
    if (issuerCn === subjectCn) break; // autoassinado
    const next = pool.find((c) => formatDn(c, "subject") === issuerCn);
    if (!next) break;
    if (chain.includes(next)) break;
    chain.push(next);
    current = next;
  }
  return chain;
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

  // Tenta cada chave privada até achar um certificado que case (como o Adobe).
  const keyEntries = [...bagsKey, ...bagsKeyPlain].filter((b) => b?.key);
  let chosenKey: forge.pki.PrivateKey | null = null;
  let chosenCert: forge.pki.Certificate | null = null;
  let chosenBag: forge.pkcs12.Bag | undefined;

  for (const keyEntry of keyEntries) {
    const key = keyEntry.key!;
    const matched = pickSignerCertificate(key, keyEntry, bagsCert);
    if (matched) {
      chosenKey = key;
      chosenCert = matched.cert;
      chosenBag = matched.bag;
      break;
    }
  }

  if (!chosenKey || !chosenCert) {
    throw new Error(
      "Não foi possível casar a chave privada com o certificado do titular no .pfx (critério Adobe). Use um certificado A1 (.pfx) com chave RSA."
    );
  }

  let privateKeyPem: string;
  let certificatePem: string;
  let chainPem: string[];
  try {
    privateKeyPem = forge.pki.privateKeyToPem(chosenKey);
    certificatePem = forge.pki.certificateToPem(chosenCert);
    const allCerts = bagsCert
      .map((b) => b.cert)
      .filter((c): c is forge.pki.Certificate => Boolean(c));
    const chain = buildCertificateChain(chosenCert, allCerts);
    chainPem = chain.map((c) => forge.pki.certificateToPem(c));
  } catch {
    throw new Error(
      "Este certificado usa um tipo de chave não suportado no navegador. Use um .pfx A1 com RSA."
    );
  }

  // Confirma o casamento chave↔certificado (igual validação do Adobe)
  if (!privateKeyMatchesCertificate(chosenKey, chosenCert)) {
    throw new Error(
      "O certificado selecionado não corresponde à chave privada do .pfx."
    );
  }

  const certDer = forge.asn1
    .toDer(forge.pki.certificateToAsn1(chosenCert))
    .getBytes();
  const thumb = sha256HexOfBinary(certDer);

  const now = new Date();
  if (chosenCert.validity.notAfter < now) {
    throw new Error("Este certificado está vencido.");
  }
  if (chosenCert.validity.notBefore > now) {
    throw new Error("Este certificado ainda não é válido.");
  }

  const friendly = bagFriendlyName(chosenBag);
  const subject = formatDn(chosenCert, "subject");

  return {
    privateKeyPem,
    certificatePem,
    chainPem,
    subject: friendly && !friendly.includes("CA") ? friendly : subject,
    issuer: formatDn(chosenCert, "issuer"),
    serial: chosenCert.serialNumber,
    notBefore: chosenCert.validity.notBefore.toISOString(),
    notAfter: chosenCert.validity.notAfter.toISOString(),
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
  certificatePem: string,
  chainPem: string[] = []
): Uint8Array {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(certificatePem);

  // Assina o digest SHA-256 do PDF (conteúdo pequeno e estável no browser).
  const md = forge.md.sha256.create();
  md.update(uint8ToBinary(contentBytes));
  const digestBinary = md.digest().getBytes();

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(digestBinary);
  // Cadeia completa (titular + intermediários), como o Adobe
  const chain = chainPem.length ? chainPem : [certificatePem];
  for (const pem of chain) {
    try {
      p7.addCertificate(forge.pki.certificateFromPem(pem));
    } catch {
      /* ignora PEM inválido da cadeia */
    }
  }
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
  page.drawText("Assinado com certificado digital", {
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
      opts.cert.certificatePem,
      opts.cert.chainPem || [opts.cert.certificatePem]
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
  (cert as { chainPem: string[] }).chainPem = [];
}
