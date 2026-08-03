"use client";

import { useEffect, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { PublicProjectDetail } from "@/components/public";

export default function CulturaInclusaoSocial() {
  const [titulo, setTitulo] = useState("Cultura e Inclusão Social");
  const [lead, setLead] = useState(
    "Circuitos culturais, oficinas artísticas e ações de inclusão sociocultural em territórios periféricos do estado de São Paulo."
  );
  const [paragrafos, setParagrafos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos-cultura-inclusao-social",
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
