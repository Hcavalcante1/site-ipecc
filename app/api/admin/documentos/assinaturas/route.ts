import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos, requestAuditMeta } from "@/lib/documentos";
import { processoIdsDoEscopo } from "@/lib/auth/adminEscopo";
import {
  criarAssinaturaDocumento,
  listarAssinaturas,
  tabelaAssinaturaAusente,
} from "@/lib/documentos/signatureService";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const documentId = req.nextUrl.searchParams.get("document_id") || undefined;
  const processoIds = processoIdsDoEscopo(auth.contexto);
  const { data, error } = await listarAssinaturas({
    processoIds,
    documentId,
  });

  if (error) {
    if (tabelaAssinaturaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        signatures: [],
        aviso:
          "Tabelas de assinatura ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, signatures: data || [] });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      document_id?: string;
      provider_code?: string;
      signer_email?: string;
      signer_name?: string;
      distribute?: boolean;
      modo?: "eu_assino" | "enviar_signatarios";
    };
    const documentId = String(body.document_id || "").trim();
    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: "document_id é obrigatório." },
        { status: 400 }
      );
    }

    const loaded = await carregarDocumentoNoEscopo(documentId, auth);
    if (loaded.error) return loaded.error;
    const doc = loaded.data!;

    if (!doc.storage_path) {
      return NextResponse.json(
        {
          ok: false,
          error: "Envie um arquivo no documento antes de pedir assinatura.",
        },
        { status: 400 }
      );
    }

    const modoExplicit =
      body.modo === "eu_assino" || body.modo === "enviar_signatarios"
        ? body.modo
        : null;
    const modo =
      modoExplicit ||
      (String(body.signer_email || "").trim()
        ? "enviar_signatarios"
        : "eu_assino");

    const meta = requestAuditMeta(req);
    const { data, error, signingUrl, embedUrl } = await criarAssinaturaDocumento(
      {
        documentId,
        userId: auth.userId,
        actorEmail: auth.contexto.email,
        processoId: doc.processo_id,
        ip: meta.ip,
        userAgent: meta.user_agent,
        providerCode: body.provider_code,
        signerEmail: body.signer_email,
        signerName: body.signer_name,
        distribute: body.distribute,
        modo,
      }
    );

    if (error) {
      const msg =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: string }).message)
          : String(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";
      if (tabelaAssinaturaAusente(msg, code)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tabelas de assinatura ausentes. Aplique docs/sql/gestao-documental-fase-1.sql.",
          },
          { status: 503 }
        );
      }
      const status =
        code === "NO_PROVIDER" ||
        code === "DOCUMENTO_MISSING" ||
        code === "DOCUMENSO_MISSING" ||
        code === "GOVBR_MISSING" ||
        code === "NO_ACTOR_EMAIL"
          ? 400
          : 500;
      return NextResponse.json({ ok: false, error: msg }, { status });
    }

    return NextResponse.json({
      ok: true,
      signature: data,
      signingUrl,
      embedUrl,
      modo,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao criar assinatura.",
      },
      { status: 500 }
    );
  }
}
