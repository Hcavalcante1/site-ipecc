import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { processoIdsDoEscopo } from "@/lib/auth/adminEscopo";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  tabelaNotificacaoAusente,
} from "@/lib/documentos/notificationsService";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const unread = req.nextUrl.searchParams.get("unread") === "1";
  const processoIds = processoIdsDoEscopo(auth.contexto);
  const { data, error } = await listarNotificacoes({
    userId: auth.userId,
    processoIds,
    apenasNaoLidas: unread,
  });

  if (error) {
    if (tabelaNotificacaoAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        notifications: [],
        aviso:
          "Tabela de notificações ausente. Aplique docs/sql/gestao-documental-fase-4-6.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, notifications: data || [] });
}

export async function DELETE(_req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const { error } = await marcarTodasNotificacoesLidas(auth.userId, processoIds);
  if (error) {
    return NextResponse.json(
      { ok: false, error: (error as { message: string }).message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as { id?: string };
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id é obrigatório." },
        { status: 400 }
      );
    }

    const { data, error } = await marcarNotificacaoLida(id, auth.userId);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, notification: data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao marcar como lida.",
      },
      { status: 500 }
    );
  }
}
