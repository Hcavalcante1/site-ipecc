"use client";

import { useEffect, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { resolveMediaPath } from "@/lib/media";
import { PublicProjectDetail } from "@/components/public";

export default function CulturaInclusaoSocial() {
  const [titulo, setTitulo] = useState("Cultura e Inclusão Social");
  const [lead, setLead] = useState(
    "Circuitos culturais, oficinas artísticas e ações de inclusão sociocultural em territórios periféricos do estado de São Paulo."
  );
  const [imagem, setImagem] = useState("");
  const [paragrafos, setParagrafos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos-cultura-inclusao-social",
        "corpo",
        "titulo, texto, imagem_url, extra"
      );
      if (data) {
        if (data.titulo) setTitulo(data.titulo);
        if (data.texto) setLead(data.texto);
        if (data.imagem_url) setImagem(resolveMediaPath(data.imagem_url) || "");
        setParagrafos(parsePaginaExtra<string[]>(data.extra, []));
      }
    }
    load();
  }, []);

  return (
    <PublicProjectDetail title={titulo} lead={lead} image={imagem || undefined}>
      {paragrafos.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </PublicProjectDetail>
  );
}
