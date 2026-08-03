import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { clientKey, rateLimited, ok, err, OPTIONS } from "../_shared";

export { OPTIONS };
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (rateLimited(clientKey(req))) return err("Rate limit excedido. Máx 30 req/min.", 429);

  const url = new URL(req.url);
  const pagina = url.searchParams.get("pagina") ?? "projetos";

  const { data, error } = await supabase
    .from("paginas_eixos")
    .select("id, titulo, texto, imagem_url, ordem, bloco, pagina_slug")
    .eq("pagina_slug", pagina)
    .eq("bloco", "eixos")
    .order("ordem", { ascending: true });

  if (error) return err(error.message, 500);
  return ok(data ?? [], { total: (data ?? []).length });
}
