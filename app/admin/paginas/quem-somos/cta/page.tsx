"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QuemSomosCtaAdminPage() {

  const [titulo, setTitulo] = useState(
    "Compromisso com impacto, responsabilidade e transformação social"
  );

  const [texto1, setTexto1] = useState(
    "O IPECC atua com rigor técnico, responsabilidade institucional e compromisso público, desenvolvendo projetos estruturados que geram impacto real nas comunidades. Nossas ações são planejadas com base em evidências, indicadores de resultado e alinhamento com políticas públicas, garantindo eficiência, transparência e relevância social."
  );

  const [texto2, setTexto2] = useState(
    "Mais do que executar projetos, construímos soluções sustentáveis que fortalecem territórios, ampliam oportunidades e promovem cidadania. Cada iniciativa é conduzida com responsabilidade, ética e foco em resultados concretos para a sociedade."
  );

  const [conviteTitulo, setConviteTitulo] = useState(
    "Construa soluções conosco"
  );

  const [conviteTexto, setConviteTexto] = useState(
    "Se você é gestor público, organização parceira, profissional da educação, cultura ou assistência social, ou uma instituição comprometida com impacto social, o IPECC está preparado para desenvolver projetos estruturados, inovadores e alinhados às demandas reais da sociedade."
  );

  const [botaoTexto, setBotaoTexto] = useState("Entrar em contato com o IPECC");
  const [botaoLink, setBotaoLink] = useState("/contato");

  const [msg, setMsg] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,.5)",
    background: "#020617",
    color: "#e6edf3",
    fontSize: ".95rem",
  };

  const textAreaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 110,
  };

  // LOAD
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto, extra")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "cta")
        .maybeSingle();

      if (data) {
        setTitulo(data.titulo || "");

        const partes = data.texto ? data.texto.split("\n\n") : [];
        setTexto1(partes[0] || "");
        setTexto2(partes[1] || "");

        const extra =
          typeof data.extra === "string"
            ? JSON.parse(data.extra)
            : data.extra || {};

        setConviteTitulo(extra.conviteTitulo || "");
        setConviteTexto(extra.conviteTexto || "");
        setBotaoTexto(extra.botaoTexto || "");
        setBotaoLink(extra.botaoLink || "");
      }
    }

    load();
  }, []);

  // SAVE
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const texto = `${texto1}\n\n${texto2}`;

    const extra = {
      conviteTitulo,
      conviteTexto,
      botaoTexto,
      botaoLink,
    };

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "quem-somos",
          bloco: "cta",
          titulo,
          texto,
          extra,
        },
        { onConflict: "pagina_slug,bloco" }
      );

    if (error) {
      console.error(error);
      setMsg("Erro ao salvar");
      return;
    }

    setMsg("CTA atualizado com sucesso");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">CTA Final — Quem Somos</h1>
        <p className="admin-subtitle">
          Este bloco representa o fechamento institucional e o convite de conversão da página.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ marginBottom: 10 }}>Bloco institucional (lado esquerdo)</h2>

          <label>Título principal</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />

          <label style={{ marginTop: 10 }}>Parágrafo 1</label>
          <textarea value={texto1} onChange={(e) => setTexto1(e.target.value)} style={textAreaStyle} />

          <label style={{ marginTop: 10 }}>Parágrafo 2</label>
          <textarea value={texto2} onChange={(e) => setTexto2(e.target.value)} style={textAreaStyle} />
        </div>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ marginBottom: 10 }}>Bloco de conversão (lado direito)</h2>

          <label>Título do convite</label>
          <input value={conviteTitulo} onChange={(e) => setConviteTitulo(e.target.value)} style={inputStyle} />

          <label style={{ marginTop: 10 }}>Texto do convite</label>
          <textarea value={conviteTexto} onChange={(e) => setConviteTexto(e.target.value)} style={textAreaStyle} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label>Texto do botão</label>
              <input value={botaoTexto} onChange={(e) => setBotaoTexto(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label>Link do botão</label>
              <input value={botaoLink} onChange={(e) => setBotaoLink(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <button type="submit" className="admin-button">
          Salvar CTA
        </button>

        {msg && <p style={{ marginTop: 12, color: "#22c55e" }}>{msg}</p>}
      </form>
    </>
  );
}