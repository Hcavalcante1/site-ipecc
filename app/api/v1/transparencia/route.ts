import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { clientKey, rateLimited, ok, err, OPTIONS } from "../_shared";

export { OPTIONS };
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (rateLimited(clientKey(req))) return err("Rate limit excedido. Máx 30 req/min.", 429);

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo"); // convenios | prestacao
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const [{ data: convenios, count: cCount }, { data: prestacao, count: pCount }] =
    await Promise.all([
      tipo && tipo !== "convenios"
        ? { data: [], count: 0 }
        : supabase
            .from("transparencia_convenios")
            .select("id, titulo, publicado, created_at", { count: "exact" })
            .eq("publicado", true)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1),
      tipo && tipo !== "prestacao"
        ? { data: [], count: 0 }
        : supabase
            .from("transparencia_prestacao_contas")
            .select("id, titulo, publicado, created_at", { count: "exact" })
            .eq("publicado", true)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1),
    ]);

  const conveniosList = ((convenios ?? []) as object[]).map((d) => ({ ...d, tipo: "convenio" }));
  const prestacaoList = ((prestacao ?? []) as object[]).map((d) => ({ ...d, tipo: "prestacao_contas" }));

  type Doc = { created_at: string; tipo: string };
  const merged = [...conveniosList, ...prestacaoList].sort(
    (a, b) =>
      new Date((b as unknown as Doc).created_at).getTime() -
      new Date((a as unknown as Doc).created_at).getTime()
  );

  return ok(merged, { total: (cCount ?? 0) + (pCount ?? 0), limit, offset });
}
