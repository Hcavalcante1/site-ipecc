import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  atualizarDocumentoTipo,
  criarDocumentoTipo,
  listarDocumentosTipos,
} from "@/lib/editais/documentosTipos";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const para = req.nextUrl.searchParams.get("para");
  const todos = req.nextUrl.searchParams.get("todos") === "1";

  const result = await listarDocumentosTipos({
    apenasAtivos: !todos,
    paraPublicacao: para === "publicacao",
    paraEmissao: para === "emissao",
    paraPrestacao: para === "prestacao",
  });

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: result.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    tipos: result.data || [],
    aviso: result.aviso,
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  let body: {
    label?: string;
    codigo?: string;
    descricao?: string;
    para_publicacao?: boolean;
    para_emissao?: boolean;
    para_prestacao?: boolean;
    tipo_publicacao_padrao?: string;
    criar_modelo?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const result = await criarDocumentoTipo({
    label: String(body.label || ""),
    codigo: body.codigo,
    descricao: body.descricao,
    paraPublicacao: body.para_publicacao !== false,
    paraEmissao: Boolean(body.para_emissao),
    paraPrestacao: Boolean(body.para_prestacao),
    tipoPublicacaoPadrao: body.tipo_publicacao_padrao,
    userId: auth.userId,
    criarModeloEmissao: body.criar_modelo !== false,
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { ok: false, error: result.error?.message || "Falha ao criar tipo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, tipo: result.data });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  let body: {
    codigo?: string;
    label?: string;
    descricao?: string | null;
    ativo?: boolean;
    para_publicacao?: boolean;
    para_emissao?: boolean;
    para_prestacao?: boolean;
    tipo_publicacao_padrao?: string | null;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const result = await atualizarDocumentoTipo({
    codigo: String(body.codigo || ""),
    label: body.label,
    descricao: body.descricao,
    ativo: body.ativo,
    paraPublicacao: body.para_publicacao,
    paraEmissao: body.para_emissao,
    paraPrestacao: body.para_prestacao,
    tipoPublicacaoPadrao: body.tipo_publicacao_padrao,
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { ok: false, error: result.error?.message || "Falha ao atualizar." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, tipo: result.data });
}
