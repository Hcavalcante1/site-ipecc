import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { clientKey, rateLimited, ok, err, OPTIONS } from "../_shared";

export { OPTIONS };
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (rateLimited(clientKey(req))) return err("Rate limit excedido. Máx 30 req/min.", 429);

  const [
    { count: editaisAbertos },
    { count: editaisTotal },
    { count: propostas },
    { count: beneficiarios },
    { count: convenios },
    { count: prestacao },
  ] = await Promise.all([
    supabase.from("editais").select("id", { count: "exact", head: true }).eq("status", "aberto"),
    supabase.from("editais").select("id", { count: "exact", head: true }).neq("status", "rascunho"),
    supabase.from("propostas").select("id", { count: "exact", head: true }),
    supabase.from("beneficiarios").select("id", { count: "exact", head: true }),
    supabase.from("transparencia_convenios").select("id", { count: "exact", head: true }).eq("publicado", true),
    supabase.from("transparencia_prestacao_contas").select("id", { count: "exact", head: true }).eq("publicado", true),
  ]);

  return ok({
    editais_abertos: editaisAbertos ?? 0,
    editais_publicados: editaisTotal ?? 0,
    propostas_recebidas: propostas ?? 0,
    beneficiarios_cadastrados: beneficiarios ?? 0,
    documentos_transparencia: (convenios ?? 0) + (prestacao ?? 0),
    atualizado_em: new Date().toISOString(),
  });
}
