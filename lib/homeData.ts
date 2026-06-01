import { createClient } from "./supabaseServer";
import { HOME_QUERIES } from "./queries";
import { fetchPaginaConteudo } from "./cms/paginasConteudo";

export async function getHomeData() {
  const supabase = createClient();

  const hero = await fetchPaginaConteudo(
    supabase,
    "home",
    HOME_QUERIES.HERO
  );

  const sobre = await fetchPaginaConteudo(
    supabase,
    "home",
    HOME_QUERIES.SOBRE
  );

  const { data: noticias } = await supabase
    .from("noticias")
    .select("*")
    .eq("publicado", true)
    .order("created_at", { ascending: false })
    .limit(2);

  const { data: eventos } = await supabase
    .from("eventos")
    .select("*")
    .eq("publicado", true)
    .order("data_evento", { ascending: true })
    .limit(2);

  return {
    hero,
    sobre,
    noticias,
    eventos,
  };
}