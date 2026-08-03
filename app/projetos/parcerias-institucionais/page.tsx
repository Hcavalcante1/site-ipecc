"use client";

import { useEffect, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { PublicProjectDetail } from "@/components/public";

export default function ParceriasInstitucionais() {
  const [titulo, setTitulo] = useState("Parcerias Institucionais");
  const [lead, setLead] = useState(
    "Cooperação técnica com o poder público, escolas, organizações da sociedade civil e iniciativa privada para ampliar o impacto social."
  );
  const [paragrafos, setParagrafos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos-parcerias-institucionais",
        "corpo",
        "titulo, texto, extra"
      );
      if (data) {
        if (data.titulo) setTitulo(data.titulo);
        if (data.texto) setLead(data.texto);
        setParagrafos(parsePaginaExtra<string[]>(data.extra, []));
      }
    }
    load();
  }, []);

  return (
    <PublicProjectDetail title={titulo} lead={lead}>
      {paragrafos.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </PublicProjectDetail>
  );
}
