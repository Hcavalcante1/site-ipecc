import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  carregarAnexosResolvidosPorPropostas,
  usePropostaAnexosTableLeitura,
} from "@/lib/documental/propostaAnexosHibrido";
import { existeArquivoProposta } from "@/lib/storage/propostasBucket";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PropostaEntrada = { id: string; paths: string[] };

const MAX_PROPOSTAS = 40;
const MAX_PATHS_POR_PROPOSTA = 25;

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const propostas = (Array.isArray(body?.propostas) ? body.propostas : []) as PropostaEntrada[];

    if (propostas.length === 0) {
      return NextResponse.json({ ok: true, resumo: {} });
    }

    if (propostas.length > MAX_PROPOSTAS) {
      return NextResponse.json(
        { ok: false, error: `Máximo de ${MAX_PROPOSTAS} propostas por consulta` },
        { status: 400 }
      );
    }

    const resumo: Record<
      string,
      { total: number; disponiveis: number; orfaos: number }
    > = {};

    const pathsHibridoPorId = new Map<string, string[]>();

    if (usePropostaAnexosTableLeitura()) {
      const ids = propostas
        .map((p) => String(p.id || "").trim())
        .filter(Boolean)
        .slice(0, MAX_PROPOSTAS);

      if (ids.length > 0) {
        const { data: rows, error: dbError } = await supabaseAdmin
          .from("propostas")
          .select("*")
          .in("id", ids);

        if (dbError) {
          return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
        }

        const resolvidos = await carregarAnexosResolvidosPorPropostas(
          supabaseAdmin,
          (rows || []) as Record<string, unknown>[]
        );

        for (const [pid, refs] of resolvidos) {
          pathsHibridoPorId.set(
            pid,
            refs.map((r) => r.path).slice(0, MAX_PATHS_POR_PROPOSTA)
          );
        }
      }
    }

    for (const item of propostas) {
      const id = String(item.id || "").trim();
      if (!id) continue;

      const paths = (
        pathsHibridoPorId.get(id) ??
        (Array.isArray(item.paths) ? item.paths : [])
          .map((p) => String(p || "").trim())
          .filter(Boolean)
      ).slice(0, MAX_PATHS_POR_PROPOSTA);

      if (paths.length === 0) {
        resumo[id] = { total: 0, disponiveis: 0, orfaos: 0 };
        continue;
      }

      const checks = await Promise.all(
        paths.map((path) => existeArquivoProposta(path))
      );

      const disponiveis = checks.filter((c) => c.exists).length;
      resumo[id] = {
        total: paths.length,
        disponiveis,
        orfaos: paths.length - disponiveis,
      };
    }

    return NextResponse.json({ ok: true, resumo });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
