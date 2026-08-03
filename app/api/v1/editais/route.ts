import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { clientKey, rateLimited, ok, err, OPTIONS } from "../_shared";

export { OPTIONS };
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (rateLimited(clientKey(req))) return err("Rate limit excedido. Máx 30 req/min.", 429);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  let query = supabase
    .from("editais")
    .select("id, titulo, status, fase_atual, descricao, created_at", { count: "exact" })
    .neq("status", "rascunho")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);

  return ok(data, { total: count ?? 0, limit, offset });
}
