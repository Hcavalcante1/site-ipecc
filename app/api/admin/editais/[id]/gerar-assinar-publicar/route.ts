import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { podeAcessarProcesso } from "@/lib/auth/adminEscopo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  iniciarGerarAssinarPublicar,
  isTipoEmissaoOficial,
  listarEmissoesDoEdital,
  modelosDisponiveisParaEdital,
} from "@/lib/documentos-oficiais";

type Ctx = { params: { id: string } };

async function carregarEditalNoEscopo(editalId: string, auth: {
  ok: true;
  contexto: Parameters<typeof podeAcessarProcesso>[0];
}) {
  const admin = getSupabaseAdmin();
  const { data: edital, error } = await admin
    .from("editais")
    .select("id, tipo, fase_atual, processo_id, titulo")
    .eq("id", editalId)
    .maybeSingle();

  if (error || !edital) {
    return {
      error: NextResponse.json(
        { ok: false, error: error?.message || "Edital não encontrado." },
        { status: error ? 500 : 404 }
      ),
    };
  }

  if (!podeAcessarProcesso(auth.contexto, edital.processo_id)) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error:
            "Acesso negado — este edital está fora do seu escopo de processo.",
        },
        { status: 403 }
      ),
    };
  }

  return { edital };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const scoped = await carregarEditalNoEscopo(params.id, auth);
  if (scoped.error) return scoped.error;

  const [modelos, emissoes] = await Promise.all([
    modelosDisponiveisParaEdital({
      tipoEdital: scoped.edital.tipo,
      faseAtual: scoped.edital.fase_atual,
    }),
    listarEmissoesDoEdital(params.id),
  ]);

  return NextResponse.json({
    ok: true,
    modelos: modelos.data ?? [],
    emissoes: emissoes.data ?? [],
    warnings: {
      modelos: modelos.error?.message ?? null,
      emissoes: emissoes.error?.message ?? null,
    },
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const scoped = await carregarEditalNoEscopo(params.id, auth);
  if (scoped.error) return scoped.error;

  let body: {
    tipoEmissao?: string;
    signatario?: { nome?: string; email?: string };
    modo?: "eu_assino" | "enviar_signatarios";
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const tipo = String(body.tipoEmissao || "").trim();
  if (!isTipoEmissaoOficial(tipo)) {
    return NextResponse.json(
      { ok: false, error: "Tipo de emissão oficial inválido." },
      { status: 400 }
    );
  }

  const modo =
    body.modo === "enviar_signatarios" ? "enviar_signatarios" : "eu_assino";

  const result = await iniciarGerarAssinarPublicar({
    editalId: params.id,
    tipoEmissao: tipo,
    signatario: {
      nome: String(body.signatario?.nome || "").trim(),
      email: String(body.signatario?.email || "").trim(),
    },
    userId: auth.userId,
    actorEmail: auth.contexto.email,
    modo,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    emissaoId: result.emissaoId,
    gdDocumentId: result.gdDocumentId,
    signatureDocumentId: result.signatureDocumentId,
    signingUrl: result.signingUrl,
    embedUrl: result.embedUrl,
    modo: result.modo,
    aviso: result.aviso,
  });
}
