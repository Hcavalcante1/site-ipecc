import { getSupabase } from "./getSupabase";
import { HOME_QUERIES } from "./queries";

export async function getHomeData() {
  const supabase = getSupabase();

  const { data: hero } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "home")
    .eq("bloco", HOME_QUERIES.HERO)
    .maybeSingle();

  const { data: sobre } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "home")
    .eq("bloco", HOME_QUERIES.SOBRE)
    .maybeSingle();

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