"use client";

import { useEffect, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { resolveMediaPath } from "@/lib/media";
import { PublicProjectDetail } from "@/components/public";

export default function OficinasEducacaoCidada() {
  const [titulo, setTitulo] = useState("Oficinas de Educação Cidadã");
  const [lead, setLead] = useState(
    "Formação em direitos, convivência democrática e participação social para jovens, adultos e lideranças comunitárias."
  );
  const [imagem, setImagem] = useState("");
  const [video, setVideo] = useState("");
  const [paragrafos, setParagrafos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos-oficinas-educacao-cidada",
        "corpo",
        "titulo, texto, imagem_url, video_url, extra"
      );
      if (data) {
        if (data.titulo) setTitulo(data.titulo);
        if (data.texto) setLead(data.texto);
        if (data.imagem_url) setImagem(resolveMediaPath(data.imagem_url) || "");
        if ((data as any).video_url) setVideo((data as any).video_url);
        setParagrafos(parsePaginaExtra<string[]>(data.extra, []));
      }
    }
    load();
  }, []);

  return (
    <PublicProjectDetail title={titulo} lead={lead} image={imagem || undefined} video={video || undefined}>
      {paragrafos.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </PublicProjectDetail>
  );
}
