import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { existeArquivoProposta } from "@/lib/storage/propostasBucket";

// Prevent pre-rendering during build
export const dynamic = "force-dynamic";

type ItemEntrada = { path: string; label?: string };

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const itens = (Array.isArray(body?.itens) ? body.itens : []) as ItemEntrada[];

    if (itens.length === 0) {
      return NextResponse.json({ ok: true, resultados: [] });
    }

    if (itens.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Máximo de 50 anexos por verificação" },
        { status: 400 }
      );
    }

    const resultados = await Promise.all(
      itens.map(async (item) => {
        const path = String(item.path || "").trim();
        if (!path) {
          return {
            path,
            label: item.label ?? null,
            exists: false,
            resolvedPath: null,
          };
        }

        const check = await existeArquivoProposta(path);
        return {
          path,
          label: item.label ?? null,
          exists: check.exists,
          resolvedPath: check.exists ? check.resolvedPath : null,
        };
      })
    );

    return NextResponse.json({ ok: true, resultados });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
