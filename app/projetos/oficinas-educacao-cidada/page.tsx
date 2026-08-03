"use client";

import { useEffect, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { PublicProjectDetail } from "@/components/public";

export default function OficinasEducacaoCidada() {
  const [titulo, setTitulo] = useState("Oficinas de Educação Cidadã");
  const [lead, setLead] = useState(
    "Formação em direitos, convivência democrática e participação social para jovens, adultos e lideranças comunitárias."
  );
  const [paragrafos, setParagrafos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos-oficinas-educacao-cidada",
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
