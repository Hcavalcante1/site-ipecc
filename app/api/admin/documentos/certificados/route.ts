import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import {
  deleteCertificateProfile,
  listCertificateProfiles,
  saveCertificateProfile,
} from "@/lib/documentos/assinaturas/certificate/certificateVaultService";

export const dynamic = "force-dynamic";

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const result = await listCertificateProfiles(auth.userId);
  if (result.ok === false) {
    return NextResponse.json(
      { ok: false, error: result.error, profiles: [] },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json({ ok: true, profiles: result.profiles });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const form = await req.formData();
    const file = form.get("pfx");
    const label = String(form.get("label") || "").trim();
    const sourceFilename = String(form.get("sourceFilename") || "").trim();
    const metaRaw = form.get("metadata");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Envie o arquivo .pfx/.p12." },
        { status: 400 }
      );
    }

    let metadata: {
      subject: string;
      issuer: string;
      serial: string;
      notBefore: string;
      notAfter: string;
      thumbprintSha256: string;
      thumbprintSha1?: string | null;
      icpBrasil?: {
        cnpj: string | null;
        cpf: string | null;
        responsavel: string | null;
        razaoSocial: string | null;
      } | null;
    };
    try {
      metadata = JSON.parse(String(metaRaw || "{}"));
    } catch {
      return NextResponse.json(
        { ok: false, error: "Metadados do certificado inválidos." },
        { status: 400 }
      );
    }

    if ((file as File).size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Arquivo .pfx/.p12 excede 5 MB." },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Arquivo .pfx/.p12 vazio ou inválido." },
        { status: 400 }
      );
    }

    const result = await saveCertificateProfile({
      ownerUserId: auth.userId,
      label: label || metadata.subject || sourceFilename || "Certificado",
      sourceFilename: sourceFilename || (file as File).name || null,
      pfxBytes: bytes,
      meta: metadata,
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Falha ao salvar certificado.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as { profileId?: string };
    const profileId = String(body.profileId || "").trim();
    if (!profileId) {
      return NextResponse.json(
        { ok: false, error: "Informe profileId." },
        { status: 400 }
      );
    }

    const result = await deleteCertificateProfile({
      profileId,
      ownerUserId: auth.userId,
    });
    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Falha ao excluir certificado.",
      },
      { status: 500 }
    );
  }
}
