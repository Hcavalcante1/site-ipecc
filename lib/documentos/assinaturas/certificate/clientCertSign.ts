/**
 * Assinatura com certificado no navegador.
 * A chave privada do .pfx/.p12 NUNCA sai do computador.
 */
"use client";

import forge from "node-forge";
import QRCode from "qrcode";
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import {
  getCertificateHolderCnpj,
  getCertificateHolderLabel,
} from "./certificateIdentity";

export type LoadedCertificate = {
  privateKeyPem: string;
  certificatePem: string;
  /** Cadeia completa (titular + intermediários), como o Adobe embute. */
  chainPem: string[];
  /** CN do Subject (titular do certificado). */
  subject: string;
  /** Nome para exibir/carimbar (responsável ICP-Brasil ou CN). */
  displayName: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  thumbprintSha256: string;
  thumbprintSha1: string;
  /** Dados ICP-Brasil extraídos do Subject Alternative Name. */
  icpBrasil: {
    cnpj: string | null;
    cpf: string | null;
    responsavel: string | null;
    razaoSocial: string | null;
  };
  subjectDn: string;
  issuerDn: string;
};

/** Dimensões do carimbo visual (pt) — preview e PDF usam o mesmo. */
export const CERT_STAMP_BOX = { w: 220, h: 64, margin: 12 };

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
  validationCode?: string;
};

function clampPct(n: number, fallback: number): number {
  const v = Number.isFinite(n) ? n : fallback;
  return Math.min(100, Math.max(0, v));
}

function fitFontSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size = Number((size - 0.1).toFixed(1));
  }
  return size;
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

function sha1HexOfBinary(bytes: string): string {
  const md = forge.md.sha1.create();
  md.update(bytes);
  return md.digest().toHex();
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

function formatDn(cert: forge.pki.Certificate, which: "subject" | "issuer"): string {
  const attrs =
    which === "subject" ? cert.subject.attributes : cert.issuer.attributes;
  return attrs
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(", ");
}

function formatCn(cert: forge.pki.Certificate, which: "subject" | "issuer"): string {
  const attrs =
    which === "subject" ? cert.subject.attributes : cert.issuer.attributes;
  const cn = attrValue(attrs, "CN");
  if (cn) return cn;
  return formatDn(cert, which);
}

function formatCnpjDigits(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj.trim() || null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpfDigits(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf.trim() || null;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
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

function certIsCa(cert: forge.pki.Certificate): boolean {
  const bc = cert.getExtension("basicConstraints") as
    | { cA?: boolean }
    | undefined;
  return Boolean(bc?.cA);
}

/**
 * Critério Adobe/OpenSSL: certificado cuja chave pública casa com a privada.
 */
function privateKeyMatchesCertificate(
  privateKey: forge.pki.PrivateKey,
  cert: forge.pki.Certificate
): boolean {
  try {
    const priv = privateKey as {
      n?: { compareTo: (o: unknown) => number };
      e?: { compareTo: (o: unknown) => number };
    };
    const pub = cert.publicKey as {
      n?: { compareTo: (o: unknown) => number };
      e?: { compareTo: (o: unknown) => number };
    };
    if (priv.n && pub.n && priv.e && pub.e) {
      return priv.n.compareTo(pub.n) === 0 && priv.e.compareTo(pub.e) === 0;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Documentação node-forge: após achar a chave, buscar o certificado
 * pelo mesmo localKeyId — é assim que o Adobe/OpenSSL ligam os dois.
 */
function findCertByLocalKeyId(
  p12: forge.pkcs12.Pkcs12Pfx,
  keyBag: forge.pkcs12.Bag
): forge.pkcs12.Bag | null {
  const keyIdBytes = bagAttrBytes(keyBag, "localKeyId");
  const keyIdHex = bagAttrHex(keyBag, "localKeyId");

  const candidates: forge.pkcs12.Bag[] = [];

  if (keyIdBytes) {
    try {
      const byId = p12.getBags({ localKeyId: keyIdBytes as never });
      const list = (byId.localKeyId || []) as forge.pkcs12.Bag[];
      candidates.push(...list);
    } catch {
      /* ignore */
    }
  }
  if (keyIdHex) {
    try {
      const byHex = p12.getBags({ localKeyIdHex: keyIdHex });
      const list = (byHex.localKeyId || []) as forge.pkcs12.Bag[];
      candidates.push(...list);
    } catch {
      /* ignore */
    }
  }

  const certBag = candidates.find((b) => b?.cert && !certIsCa(b.cert));
  if (certBag?.cert) return certBag;
  const any = candidates.find((b) => b?.cert);
  return any || null;
}

function buildCertificateChain(
  leaf: forge.pki.Certificate,
  all: forge.pki.Certificate[]
): forge.pki.Certificate[] {
  const chain: forge.pki.Certificate[] = [leaf];
  const pool = all.filter((c) => c !== leaf);
  let current = leaf;
  for (let i = 0; i < 8; i++) {
    const issuerDn = formatDn(current, "issuer");
    const subjectDn = formatDn(current, "subject");
    if (issuerDn === subjectDn) break;
    const next =
      pool.find((c) => formatDn(c, "subject") === issuerDn) ||
      pool.find((c) => formatCn(c, "subject") === formatCn(current, "issuer"));
    if (!next || chain.includes(next)) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

/** OIDs ICP-Brasil em Subject Alternative Name (DOC-ICP-04 / DOC-ICP-04.01). */
const ICP_OID = {
  cpfPf: "2.16.76.1.3.1",
  responsavel: "2.16.76.1.3.2",
  cnpj: "2.16.76.1.3.3",
  dadosResponsavel: "2.16.76.1.3.4",
  razaoSocial: "2.16.76.1.3.8",
} as const;

type Asn1Node = {
  type?: number;
  constructed?: boolean;
  value?: string | Asn1Node[];
};

function asn1FirstString(node: Asn1Node | string | undefined | null): string | null {
  if (node == null) return null;
  if (typeof node === "string") {
    const t = node.replace(/[^\x20-\x7E\u00C0-\u024F]/g, "").trim();
    return t || null;
  }
  if (typeof node.value === "string") {
    const t = node.value.replace(/[^\x20-\x7E\u00C0-\u024F]/g, "").trim();
    return t || null;
  }
  if (Array.isArray(node.value)) {
    for (const child of node.value) {
      const hit = asn1FirstString(child);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Lê otherName do SAN (type=0) conforme DOC-ICP-04:
 * OtherName ::= SEQUENCE { type-id OBJECT IDENTIFIER, value [0] EXPLICIT ANY }
 * Referência prática: node-forge + parsing ASN.1 do value.
 */
function collectIcpOtherNames(cert: forge.pki.Certificate): Record<string, string> {
  const out: Record<string, string> = {};
  const ext = cert.getExtension("subjectAltName") as
    | { altNames?: Array<{ type?: number; value?: unknown }> }
    | undefined;
  const altNames = ext?.altNames || [];

  for (const alt of altNames) {
    if (alt?.type !== 0) continue;
    const seq = alt.value as Asn1Node | Asn1Node[] | undefined;
    const parts = Array.isArray(seq) ? seq : Array.isArray(seq?.value) ? seq.value : null;
    if (!parts || parts.length < 2) continue;

    const oidNode = parts[0];
    let oid = "";
    try {
      if (oidNode?.type === forge.asn1.Type.OID && typeof oidNode.value === "string") {
        oid = forge.asn1.derToOid(oidNode.value);
      }
    } catch {
      continue;
    }
    if (!oid.startsWith("2.16.76.1.3.")) continue;

    const valueNode = parts[1] as Asn1Node;
    const text = asn1FirstString(valueNode);
    if (text) out[oid] = text;
  }

  return out;
}

function oidToDerBytes(oid: string): string {
  return forge.asn1.oidToDer(oid).getBytes();
}

/** Fallback: varre o DER do certificado atrás do OID (quando forge não expõe altNames). */
function extractPrintableAfterOid(der: string, oid: string): string | null {
  const needle = oidToDerBytes(oid);
  const idx = der.indexOf(needle);
  if (idx < 0) return null;
  let i = idx + needle.length;
  for (let guard = 0; guard < 16 && i < der.length; guard++) {
    const tag = der.charCodeAt(i) & 0xff;
    i += 1;
    if (i >= der.length) break;
    let len = der.charCodeAt(i) & 0xff;
    i += 1;
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let k = 0; k < n && i < der.length; k++) {
        len = (len << 8) | (der.charCodeAt(i) & 0xff);
        i += 1;
      }
    }
    if (
      tag === 0x0c ||
      tag === 0x13 ||
      tag === 0x04 ||
      tag === 0x16 ||
      tag === 0x1a
    ) {
      const raw = der.substring(i, i + len);
      const text = raw.replace(/[^\x20-\x7E\u00C0-\u024F]/g, "").trim();
      return text || null;
    }
    if (tag & 0x20) continue;
    i += len;
  }
  return null;
}

function cpfFromIcpPacked(dados: string | null | undefined): string | null {
  if (!dados || dados.length < 19) return null;
  const maybe = dados.slice(8, 19).replace(/\D/g, "");
  return maybe.length === 11 ? maybe : null;
}

function extractIcpBrasil(cert: forge.pki.Certificate): {
  cnpj: string | null;
  cpf: string | null;
  responsavel: string | null;
  razaoSocial: string | null;
} {
  const fromSan = collectIcpOtherNames(cert);
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();

  const pick = (oid: string): string | null =>
    fromSan[oid] || extractPrintableAfterOid(der, oid);

  const responsavel = pick(ICP_OID.responsavel);
  const razaoSocial = pick(ICP_OID.razaoSocial);
  let cnpj = pick(ICP_OID.cnpj);
  let cpf =
    cpfFromIcpPacked(pick(ICP_OID.dadosResponsavel)) ||
    cpfFromIcpPacked(pick(ICP_OID.cpfPf));

  if (cnpj) {
    const digits = cnpj.replace(/\D/g, "");
    cnpj = digits.length === 14 ? digits : cnpj.trim() || null;
  }

  // Fallback clássico do CN ICP-Brasil: RAZAO:CNPJ ou NOME:CPF
  const cn = formatCn(cert, "subject");
  const mCnpj = cn.match(/:(\d{14})$/);
  const mCpf = cn.match(/:(\d{11})$/);
  if (!cnpj && mCnpj) cnpj = mCnpj[1];
  if (!cpf && mCpf) cpf = mCpf[1];

  return {
    cnpj: cnpj || null,
    cpf: cpf || null,
    responsavel: responsavel?.trim() || null,
    razaoSocial: razaoSocial?.trim() || null,
  };
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
    // strict=false: aceita PFX de ACs brasileiras (como o Adobe)
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

  const keyEntries = [...bagsKey, ...bagsKeyPlain].filter((b) => {
    if (b?.key) return true;
    // Alguns PFX deixam a chave só em asn1 (documentação node-forge)
    if (b?.asn1) {
      try {
        b.key = forge.pki.privateKeyFromAsn1(b.asn1);
        return Boolean(b.key);
      } catch {
        return false;
      }
    }
    return false;
  });
  if (!keyEntries.length) {
    throw new Error(
      "Nenhuma chave privada encontrada no .pfx. Use um certificado A1 completo."
    );
  }

  let chosenKey: forge.pki.PrivateKey | null = null;
  let chosenCert: forge.pki.Certificate | null = null;

  for (const keyEntry of keyEntries) {
    const key = keyEntry.key!;

    // 1) Padrão Adobe/forge: certificado com o mesmo localKeyId da chave
    const byLocalId = findCertByLocalKeyId(p12, keyEntry);
    if (byLocalId?.cert && privateKeyMatchesCertificate(key, byLocalId.cert)) {
      chosenKey = key;
      chosenCert = byLocalId.cert;
      break;
    }
    if (byLocalId?.cert && !certIsCa(byLocalId.cert)) {
      chosenKey = key;
      chosenCert = byLocalId.cert;
      break;
    }

    // 2) Mesmo friendlyName da chave (comum em exportadores Windows/AC)
    const friendly = bagAttrBytes(keyEntry, "friendlyName");
    if (friendly) {
      try {
        const byName = p12.getBags({
          friendlyName: friendly,
          bagType: forge.pki.oids.certBag,
        });
        const list = (byName.friendlyName || []) as forge.pkcs12.Bag[];
        const hit = list.find(
          (b) =>
            b.cert &&
            !certIsCa(b.cert) &&
            privateKeyMatchesCertificate(key, b.cert)
        );
        if (hit?.cert) {
          chosenKey = key;
          chosenCert = hit.cert;
          break;
        }
      } catch {
        /* ignore */
      }
    }

    // 3) Casa pela chave pública RSA (OpenSSL pkcs12_read)
    const matchPub = bagsCert.find(
      (b) => b.cert && privateKeyMatchesCertificate(key, b.cert)
    );
    if (matchPub?.cert) {
      chosenKey = key;
      chosenCert = matchPub.cert;
      break;
    }
  }

  if (!chosenKey || !chosenCert) {
    throw new Error(
      "Não foi possível identificar o certificado do titular no .pfx (sem casamento chave↔certificado). Verifique se o arquivo é um A1 completo."
    );
  }

  if (certIsCa(chosenCert)) {
    throw new Error(
      "O .pfx apontou para um certificado de Autoridade Certificadora. É preciso o certificado do titular (pessoa/empresa)."
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
    chainPem = buildCertificateChain(chosenCert, allCerts).map((c) =>
      forge.pki.certificateToPem(c)
    );
  } catch {
    throw new Error(
      "Este certificado usa um tipo de chave não suportado no navegador. Use um .pfx A1 com RSA."
    );
  }

  const certDer = forge.asn1
    .toDer(forge.pki.certificateToAsn1(chosenCert))
    .getBytes();
  const thumbSha256 = sha256HexOfBinary(certDer);
  const thumbSha1 = sha1HexOfBinary(certDer);

  const now = new Date();
  if (chosenCert.validity.notAfter < now) {
    throw new Error("Este certificado está vencido.");
  }
  if (chosenCert.validity.notBefore > now) {
    throw new Error("Este certificado ainda não é válido.");
  }

  const subjectCn = formatCn(chosenCert, "subject");
  const icp = extractIcpBrasil(chosenCert);
  const displayName = getCertificateHolderLabel({
    privateKeyPem: "",
    certificatePem: "",
    chainPem: [],
    subject: subjectCn,
    displayName: subjectCn,
    issuer: formatCn(chosenCert, "issuer"),
    serial: chosenCert.serialNumber,
    notBefore: chosenCert.validity.notBefore.toISOString(),
    notAfter: chosenCert.validity.notAfter.toISOString(),
    thumbprintSha256: thumbSha256,
    thumbprintSha1: thumbSha1,
    icpBrasil: icp,
    subjectDn: formatDn(chosenCert, "subject"),
    issuerDn: formatDn(chosenCert, "issuer"),
  });

  return {
    privateKeyPem,
    certificatePem,
    chainPem,
    subject: subjectCn,
    displayName,
    issuer: formatCn(chosenCert, "issuer"),
    serial: chosenCert.serialNumber,
    notBefore: chosenCert.validity.notBefore.toISOString(),
    notAfter: chosenCert.validity.notAfter.toISOString(),
    thumbprintSha256: thumbSha256,
    thumbprintSha1: thumbSha1,
    icpBrasil: icp,
    subjectDn: formatDn(chosenCert, "subject"),
    issuerDn: formatDn(chosenCert, "issuer"),
  };
}

async function sha256Hex(u8: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", u8);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Espaço reservado (bytes) para o DER do PKCS#7 no PDF. 16 KB cobre qualquer cadeia ICP-Brasil. */
const SIG_DER_MAX_BYTES = 16384;

/** Data no formato PDF: D:YYYYMMDDHHmmSS+HH'MM' */
function pdfSigningDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const tz = -date.getTimezoneOffset();
  const s = tz >= 0 ? "+" : "-";
  const a = Math.abs(tz);
  return `D:${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}${s}${p(Math.floor(a / 60))}'${p(a % 60)}'`;
}

/**
 * Cria PKCS#7 detached para assinatura PDF (adbe.pkcs7.detached).
 * O conteúdo passado são os bytes reais do ByteRange — forge calcula o messageDigest internamente.
 */
function createPkcs7SignatureForPdf(
  bytesToSign: Uint8Array,
  privateKeyPem: string,
  certificatePem: string,
  chainPem: string[]
): Uint8Array {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(uint8ToBinary(bytesToSign));
  for (const pem of (chainPem.length ? chainPem : [certificatePem])) {
    try { p7.addCertificate(forge.pki.certificateFromPem(pem)); } catch { /* ignora */ }
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
  return binaryToUint8(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

/**
 * Embute assinatura digital no PDF usando atualização incremental (PAdES-B-B).
 * Adiciona campo /Sig com /ByteRange e /Contents conforme PDF 1.7 §12.8.
 * O validador ITI (validar.iti.gov.br) reconhece este formato.
 */
async function embedPdfSignature(
  pdfBytes: Uint8Array,
  opts: {
    privateKeyPem: string;
    certificatePem: string;
    chainPem: string[];
    name: string;
    date: Date;
  }
): Promise<Uint8Array> {
  const src = uint8ToBinary(pdfBytes);

  // Extrai metadados do trailer existente
  const trIdx = src.lastIndexOf("trailer");
  if (trIdx < 0) throw new Error("PDF inválido: sem trailer");
  const trSec = src.substring(trIdx, trIdx + 600);
  const existingSize = parseInt(trSec.match(/\/Size\s+(\d+)/)?.[1] ?? "10");
  const sxIdx = src.lastIndexOf("startxref");
  const prevXref =
    sxIdx >= 0
      ? parseInt(src.substring(sxIdx + 9, sxIdx + 40).trim()) || 0
      : 0;
  const catalogNum = parseInt(
    trSec.match(/\/Root\s+(\d+)\s+0\s+R/)?.[1] ?? "1"
  );

  // Lê a referência /Pages do catálogo original
  let pagesRef = "2 0 R";
  const catPos = src.indexOf(`${catalogNum} 0 obj`);
  if (catPos >= 0) {
    const m = src
      .substring(catPos, src.indexOf("endobj", catPos))
      .match(/\/Pages\s+(\d+\s+0\s+R)/);
    if (m) pagesRef = m[1];
  }

  // Novos números de objeto
  const acroFormNum = existingSize;
  const sigFieldNum = existingSize + 1;
  const sigValueNum = existingSize + 2;

  const dateStr = pdfSigningDate(opts.date);
  const p10 = (n: number) => String(n).padStart(10, "0");
  const BR_PH = `[${p10(0)} ${p10(0)} ${p10(0)} ${p10(0)}]`;
  const SIG_PH = "0".repeat(SIG_DER_MAX_BYTES * 2);

  // Objetos do update incremental
  const catalogObj =
    `${catalogNum} 0 obj\n` +
    `<<\n/Type /Catalog\n/Pages ${pagesRef}\n/AcroForm ${acroFormNum} 0 R\n>>\n` +
    `endobj\n`;
  const acroFormObj =
    `${acroFormNum} 0 obj\n` +
    `<<\n/Fields [${sigFieldNum} 0 R]\n/SigFlags 3\n>>\n` +
    `endobj\n`;
  const sigFieldObj =
    `${sigFieldNum} 0 obj\n` +
    `<<\n/Type /Annot\n/Subtype /Widget\n/FT /Sig\n` +
    `/Rect [0 0 0 0]\n/V ${sigValueNum} 0 R\n/T (Signature1)\n/F 132\n>>\n` +
    `endobj\n`;
  const sigValueObj =
    `${sigValueNum} 0 obj\n` +
    `<<\n/Type /Sig\n/Filter /Adobe.PPKLite\n/SubFilter /adbe.pkcs7.detached\n` +
    `/ByteRange ${BR_PH}\n` +
    `/Contents <${SIG_PH}>\n` +
    `/M (${dateStr})\n/Name (${opts.name})\n` +
    `/Reason (Assinado digitalmente)\n/Location (Brasil)\n>>\n` +
    `endobj\n`;

  // Calcula offsets
  const base = pdfBytes.length;
  const oC = base;
  const oA = oC + catalogObj.length;
  const oF = oA + acroFormObj.length;
  const oS = oF + sigFieldObj.length;
  const incObjects = catalogObj + acroFormObj + sigFieldObj + sigValueObj;
  const xrefPos = base + incObjects.length;

  const xe = (off: number) => `${p10(off)} 00000 n \n`;
  const xrefStr =
    `xref\n` +
    `${catalogNum} 1\n${xe(oC)}` +
    `${acroFormNum} 3\n${xe(oA)}${xe(oF)}${xe(oS)}`;
  const trailerStr =
    `trailer\n<<\n/Size ${existingSize + 3}\n/Root ${catalogNum} 0 R\n/Prev ${prevXref}\n>>\n` +
    `startxref\n${xrefPos}\n%%EOF\n`;

  // PDF pré-assinatura (com placeholders)
  const preSign = src + incObjects + xrefStr + trailerStr;
  const preSignBytes = binaryToUint8(preSign);

  // Localiza /Contents <SIG_PH> no objeto de assinatura
  const svPos = preSign.indexOf(`${sigValueNum} 0 obj`);
  if (svPos < 0) throw new Error("Erro interno: objeto de assinatura não encontrado");
  const contentsPos = preSign.indexOf(`/Contents <${SIG_PH}`, svPos);
  if (contentsPos < 0) throw new Error("Erro interno: placeholder de assinatura não encontrado");

  const ltPos = contentsPos + "/Contents ".length; // posição do '<'
  const gtPos = ltPos + 1 + SIG_PH.length;         // posição do '>'

  // ByteRange exclui '<HEX>'
  const r0 = 0, r1 = ltPos, r2 = gtPos + 1, r3 = preSignBytes.length - (gtPos + 1);
  const actualBR = `[${p10(r0)} ${p10(r1)} ${p10(r2)} ${p10(r3)}]`;
  if (actualBR.length !== BR_PH.length) {
    throw new Error(`ByteRange length mismatch: ${actualBR.length} vs ${BR_PH.length}`);
  }

  // Substitui ByteRange placeholder (tamanho idêntico — não desloca offsets)
  const brPos = preSign.indexOf(`/ByteRange ${BR_PH}`, svPos);
  if (brPos < 0) throw new Error("Erro interno: ByteRange placeholder não encontrado");
  const withBR =
    preSign.slice(0, brPos + "/ByteRange ".length) +
    actualBR +
    preSign.slice(brPos + "/ByteRange ".length + BR_PH.length);
  if (withBR.length !== preSign.length) {
    throw new Error("Erro interno: substituição do ByteRange alterou tamanho");
  }

  const withBRBytes = binaryToUint8(withBR);

  // Monta o conteúdo a assinar (ByteRange: duas fatias)
  const toSign = new Uint8Array(r1 + r3);
  toSign.set(withBRBytes.slice(r0, r0 + r1), 0);
  toSign.set(withBRBytes.slice(r2, r2 + r3), r1);

  // Assina
  const sigDer = createPkcs7SignatureForPdf(
    toSign,
    opts.privateKeyPem,
    opts.certificatePem,
    opts.chainPem
  );
  if (sigDer.length > SIG_DER_MAX_BYTES) {
    throw new Error(`Assinatura muito grande: ${sigDer.length} B (máx ${SIG_DER_MAX_BYTES} B)`);
  }

  // Converte DER → hex e preenche o espaço reservado
  const sigHex = Array.from(sigDer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .padEnd(SIG_PH.length, "0");

  const hexStart = ltPos + 1; // posição do primeiro char hex (após '<')
  const finalStr =
    withBR.slice(0, hexStart) +
    sigHex +
    withBR.slice(hexStart + SIG_PH.length);
  if (finalStr.length !== preSign.length) {
    throw new Error("Erro interno: substituição da assinatura alterou tamanho");
  }

  return binaryToUint8(finalStr);
}

/**
 * Assina o PDF no cliente: carimbo visual na página escolhida + PKCS#7 do hash.
 */
export async function signPdfWithLocalCertificate(opts: {
  pdfBytes: Uint8Array;
  expectedHashSha256: string;
  cert: LoadedCertificate;
  validationCode?: string;
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

  // Aparência padrão profissional (iText Description / ETSI TS 102 778-6):
  // texto preto, fundo branco, sem moldura colorida inventada.
  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: rgb(1, 1, 1),
    borderWidth: 0,
    opacity: 1,
  });

  const label =
    opts.appearance.signerLabel?.trim() ||
    getCertificateHolderLabel(opts.cert) ||
    opts.cert.displayName ||
    "";
  const subject = getCertificateHolderLabel(opts.cert) || opts.cert.displayName || label;
  const razaoSocial = opts.cert.icpBrasil.razaoSocial?.trim() || null;
  const responsavel = opts.cert.icpBrasil.responsavel?.trim() || null;
  const cnpj = formatCnpjDigits(opts.cert.icpBrasil.cnpj) || getCertificateHolderCnpj(opts.cert);
  const cpf = formatCpfDigits(opts.cert.icpBrasil.cpf);
  const validationCode = String(opts.validationCode || "").trim() || "-";
  const validationQr = await QRCode.toDataURL("https://validar.iti.gov.br", {
    margin: 0,
    width: 96,
    errorCorrectionLevel: "M",
  });
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tzMin = -now.getTimezoneOffset();
  const tzSign = tzMin >= 0 ? "+" : "-";
  const tzAbs = Math.abs(tzMin);
  const tz = `${tzSign}${pad(Math.floor(tzAbs / 60))}:${pad(tzAbs % 60)}`;
  const when = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${tz}`;
  const ink = rgb(0, 0, 0);

  const contentX = x + 6;
  const qrSize = 48;
  const validationW = 48;
  const textW = 158;
  const validationX = contentX + textW + 2;
  const qrX = validationX + 1;
  const qr = await pdfDoc.embedPng(validationQr);

  // Linha 1: "Assinado digitalmente por"
  page.drawText("Assinado digitalmente por", {
    x: contentX,
    y: y + 55,
    size: 7.0,
    font,
    color: ink,
    maxWidth: textW,
    lineHeight: 7.3,
  });
  // Linha 2: nome em negrito — wrapping natural em 7pt (não encolhe para 1 linha)
  page.drawText((subject || "").toUpperCase(), {
    x: contentX,
    y: y + 46,
    size: 7.0,
    font: fontBold,
    color: ink,
    maxWidth: textW,
    lineHeight: 7.6,
  });
  // Linhas abaixo do nome (reposicionadas para acomodar 2ª linha do nome)
  page.drawText(cnpj ? `CNPJ: ${cnpj}` : "CNPJ:", {
    x: contentX,
    y: y + 31,
    size: 6.1,
    font,
    color: ink,
    maxWidth: textW,
    lineHeight: 6.4,
  });
  if (razaoSocial || responsavel) {
    page.drawText(
      [
        razaoSocial ? `Razão social: ${razaoSocial}` : null,
        responsavel ? `Responsável: ${responsavel}` : null,
      ]
        .filter(Boolean)
        .join(" • "),
      {
        x: contentX,
        y: y + 24,
        size: 5.7,
        font,
        color: ink,
        maxWidth: textW,
        lineHeight: 6.0,
      }
    );
  }
  if (cpf) {
    page.drawText(`CPF: ${cpf}`, {
      x: contentX,
      y: y + 17,
      size: 5.7,
      font,
      color: ink,
      maxWidth: textW,
      lineHeight: 6.0,
    });
  }
  page.drawText(`Codigo de validacao: ${validationCode}`, {
    x: contentX,
    y: y + 9,
    size: 5.0,
    font,
    color: ink,
    maxWidth: textW,
    lineHeight: 5.3,
  });
  page.drawText(`Dados: ${when}`, {
    x: contentX,
    y: y + 2.5,
    size: 5.0,
    font,
    color: ink,
    maxWidth: textW,
    lineHeight: 5.3,
  });
  page.drawImage(qr, {
    x: qrX,
    y: y + 12,
    width: qrSize,
    height: qrSize,
  });
  page.drawText("VALIDAR ITI", {
    x: validationX,
    y: y + 9,
    size: 4.4,
    font: fontBold,
    color: ink,
    maxWidth: validationW,
    lineHeight: 5.0,
  });
  page.drawText("verifique em validar.iti.gov.br", {
    x: validationX,
    y: y + 2.5,
    size: 3.9,
    font,
    color: ink,
    maxWidth: validationW,
    lineHeight: 4.5,
  });

  const stamped = await pdfDoc.save({ useObjectStreams: false });
  const stampedU8 =
    stamped instanceof Uint8Array ? stamped : new Uint8Array(stamped);

  // Embute assinatura PAdES na estrutura do PDF (campo /Sig com /ByteRange + /Contents).
  let finalU8: Uint8Array;
  try {
    finalU8 = await embedPdfSignature(stampedU8, {
      privateKeyPem: opts.cert.privateKeyPem,
      certificatePem: opts.cert.certificatePem,
      chainPem: opts.cert.chainPem?.length
        ? opts.cert.chainPem
        : [opts.cert.certificatePem],
      name: opts.cert.displayName || opts.cert.subject || "",
      date: new Date(),
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Falha ao embutir assinatura no PDF: ${e.message}`
        : "Falha ao gerar a assinatura digital."
    );
  }

  return {
    signedPdfBytes: finalU8,
    pkcs7Bytes: new Uint8Array(0),
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
