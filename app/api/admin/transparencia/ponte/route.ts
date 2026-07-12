import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  isMestre,
  podeAcessarProcesso,
  podeModulo,
} from "@/lib/auth/adminEscopo";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  criarConvenioRascunhoDeProposta,
  criarPrestacaoRascunhoDeConvenio,
  espelharDocumentoGovernanca,
  garantirPrestacoesDoEdital,
} from "@/lib/transparencia/ponteCiclo";
import type { AdminContexto } from "@/lib/auth/adminEscopo";

type Body = {
  acao:
    | "convenio_de_proposta"
    | "prestacao_de_convenio"
    | "espelhar_documento"
    | "prestacoes_do_edital";
  propostaId?: string;
  convenioId?: string;
  editalId?: string;
  documento?: {
    tipo?: string | null;
    titulo?: string | null;
    arquivo_url?: string | null;
    url?: string | null;
  };
};

async function processoDaProposta(propostaId: string): Promise<string | null> {
  const { data: proposta } = await supabaseAdmin
    .from("propostas")
    .select("edital_id")
    .eq("id", propostaId)
    .maybeSingle();
  if (!proposta?.edital_id) return null;
  const { data: edital } = await supabaseAdmin
    .from("editais")
    .select("processo_id")
    .eq("id", proposta.edital_id)
    .maybeSingle();
  return edital?.processo_id || null;
}

async function processoDoEdital(editalId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("editais")
    .select("processo_id")
    .eq("id", editalId)
    .maybeSingle();
  return data?.processo_id || null;
}

async function processoDoConvenio(convenioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("transparencia_convenios")
    .select("processo_id")
    .eq("id", convenioId)
    .maybeSingle();
  return data?.processo_id || null;
}

function negarEscopo(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Processo fora do seu escopo." },
    { status: 403 }
  );
}

async function garantirEscopo(
  ctx: AdminContexto,
  processoId: string | null | undefined
): Promise<NextResponse | null> {
  if (isMestre(ctx)) return null;
  if (!podeAcessarProcesso(ctx, processoId)) return negarEscopo();
  return null;
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const ctx = auth.contexto;
  if (
    !isMestre(ctx) &&
    !podeModulo(ctx, "transparencia") &&
    !podeModulo(ctx, "propostas") &&
    !podeModulo(ctx, "editais")
  ) {
    return NextResponse.json(
      { ok: false, error: "Sem permissao para a ponte de Transparencia." },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as Body;
    let result;

    switch (body.acao) {
      case "convenio_de_proposta": {
        if (!body.propostaId) {
          return NextResponse.json(
            { ok: false, error: "Identificador da proposta é obrigatório." },
            { status: 400 }
          );
        }
        const bloqueio = await garantirEscopo(
          ctx,
          await processoDaProposta(body.propostaId)
        );
        if (bloqueio) return bloqueio;
        result = await criarConvenioRascunhoDeProposta(body.propostaId);
        break;
      }
      case "prestacao_de_convenio": {
        if (!body.convenioId) {
          return NextResponse.json(
            { ok: false, error: "Identificador do convênio é obrigatório." },
            { status: 400 }
          );
        }
        const bloqueio = await garantirEscopo(
          ctx,
          await processoDoConvenio(body.convenioId)
        );
        if (bloqueio) return bloqueio;
        result = await criarPrestacaoRascunhoDeConvenio(body.convenioId);
        break;
      }
      case "espelhar_documento": {
        if (!body.editalId || !body.documento) {
          return NextResponse.json(
            { ok: false, error: "Identificador do edital e documento são obrigatórios." },
            { status: 400 }
          );
        }
        const bloqueio = await garantirEscopo(
          ctx,
          await processoDoEdital(body.editalId)
        );
        if (bloqueio) return bloqueio;
        result = await espelharDocumentoGovernanca(
          body.editalId,
          body.documento
        );
        break;
      }
      case "prestacoes_do_edital": {
        if (!body.editalId) {
          return NextResponse.json(
            { ok: false, error: "Identificador do edital é obrigatório." },
            { status: 400 }
          );
        }
        const bloqueio = await garantirEscopo(
          ctx,
          await processoDoEdital(body.editalId)
        );
        if (bloqueio) return bloqueio;
        result = await garantirPrestacoesDoEdital(body.editalId);
        break;
      }
      default:
        return NextResponse.json(
          { ok: false, error: "Ação inválida." },
          { status: 400 }
        );
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message || "Falha na ponte." },
        { status: 400 }
      );
    }

    revalidatePath("/transparencia");
    revalidatePath("/admin/paginas/transparencia");
    revalidatePath("/admin/paginas/transparencia/convenios");
    revalidatePath("/admin/paginas/transparencia/prestacao");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro na ponte";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
