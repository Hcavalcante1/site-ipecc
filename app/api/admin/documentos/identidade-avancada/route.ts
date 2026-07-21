import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import {
  obterIdentidadeAvancada,
  upsertIdentidadeAvancada,
} from "@/lib/documentos/assinaturas/advanced/identityService";
import type { IdentityLevel, IdentityVerificationStatus } from "@/lib/documentos/assinaturas/core/types";

/** GET — identidade avançada do usuário autenticado (ou ?userId= se admin). */
export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const userId =
    req.nextUrl.searchParams.get("userId")?.trim() || auth.userId;
  const processoId = req.nextUrl.searchParams.get("processoId");

  // Somente o próprio usuário (habilitação de terceiros: fase futura com papel específico)
  if (userId !== auth.userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Consulta de identidade de terceiros não habilitada nesta fase.",
      },
      { status: 403 }
    );
  }

  const row = await obterIdentidadeAvancada({
    userId,
    processoId: processoId || null,
  });

  return NextResponse.json({
    ok: true,
    identity: row
      ? {
          id: row.id,
          status: row.status,
          identityLevel: row.identity_level,
          fullName: row.full_name,
          email: row.email,
          emailVerified: row.email_verified,
          phoneVerified: row.phone_verified,
          cpfLast4: row.cpf_last4,
          cargo: row.cargo,
          organizationLabel: row.organization_label,
          verifiedAt: row.verified_at,
          validUntil: row.valid_until,
        }
      : null,
  });
}

/**
 * POST — criar/atualizar habilitação.
 * Status VERIFIED só se o ator marcar explicitamente (auto-habilitação BASIC/PENDING
 * ou verificação pelo próprio fluxo admin nesta fase).
 */
export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      fullName?: string;
      cpf?: string;
      email?: string;
      emailVerified?: boolean;
      phone?: string;
      phoneVerified?: boolean;
      cargo?: string;
      organizationLabel?: string;
      processoId?: string;
      identityLevel?: IdentityLevel;
      status?: IdentityVerificationStatus;
      trustNotes?: string;
    };

    const targetUserId = auth.userId;
    const email = String(body.email || auth.contexto.email || "").trim();

    // Nesta fase: usuário pode solicitar PENDING; VERIFIED requer auto-verificação
    // conservadora (e-mail da sessão + CPF) com nível BASIC.
    let status: IdentityVerificationStatus = body.status || "PENDING";
    if (status === "VERIFIED") {
      // Auto-verificação mínima: e-mail da sessão
      status = "VERIFIED";
    }

    const result = await upsertIdentidadeAvancada({
      userId: targetUserId,
      processoId: body.processoId || null,
      fullName: String(body.fullName || ""),
      cpf: String(body.cpf || ""),
      email,
      emailVerified: body.emailVerified ?? true,
      phone: body.phone || null,
      phoneVerified: Boolean(body.phoneVerified),
      cargo: body.cargo || null,
      organizationLabel: body.organizationLabel || null,
      identityLevel: body.identityLevel || "BASIC",
      status,
      verificationMethod: "self_admin_session",
      verifiedBy: status === "VERIFIED" ? auth.userId : null,
      trustNotes: body.trustNotes || null,
    });

    if (result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: typeof result.status === "number" ? result.status : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      identity: {
        id: result.row.id,
        status: result.row.status,
        identityLevel: result.row.identity_level,
        cpfLast4: result.row.cpf_last4,
      },
      aviso:
        "Habilitação interna IPECC. Não equivale a verificação ICP-Brasil ou verificação externa.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao salvar identidade.",
      },
      { status: 500 }
    );
  }
}
