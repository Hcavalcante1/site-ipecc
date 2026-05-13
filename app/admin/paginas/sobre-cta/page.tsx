"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SobreCtaPage() {
  const [sobreTitulo, setSobreTitulo] = useState("Sobre o IPECC");
  const [sobreTexto, setSobreTexto] = useState(
    "O IPECC desenvolve projetos com foco em impacto social, transparência e fortalecimento das políticas públicas por meio da participação cidadã."
  );

  const [ctaTitulo, setCtaTitulo] = useState("Junte-se a nós");
  const [ctaTexto, setCtaTexto] = useState("");
  const [ctaBotaoTexto, setCtaBotaoTexto] = useState("");
  const [ctaBotaoUrl, setCtaBotaoUrl] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔥 CARREGAR DO BANCO
  useEffect(() => {
    async function carregar() {
      // SOBRE
      const { data: sobreData } = await supabase
        .from("paginas_conteudo")
        .select("*")
        .eq("pagina_slug", "home")
        .eq("bloco", "sobre")
        .maybeSingle();

      if (sobreData) {
        setSobreTitulo(sobreData.titulo || "Sobre o IPECC");
        setSobreTexto(sobreData.texto || "");
      }

      // CTA
      const { data: ctaData } = await supabase
        .from("paginas_conteudo")
        .select("extra")
        .eq("pagina_slug", "home")
        .eq("bloco", "cta_final")
        .maybeSingle();

      const cta = (ctaData as any)?.extra?.cta;

      if (cta && typeof cta === "object") {
        setCtaTitulo(cta.titulo || "");
        setCtaTexto(cta.texto || "");
        setCtaBotaoTexto(cta.label || "");
        setCtaBotaoUrl(cta.url || "");
      }

      setLoading(false);
    }

    carregar();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");

    // SOBRE
    const { error: errorSobre } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "home",
          bloco: "sobre",
          titulo: sobreTitulo,
          texto: sobreTexto, // 🔥 mantém quebra de linha
        },
        { onConflict: "pagina_slug,bloco" }
      );

    if (errorSobre) {
      console.error(errorSobre);
      setMensagem("Erro ao salvar Sobre.");
      return;
    }

    // CTA
    const { error: errorCta } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "home",
          bloco: "cta_final",
          extra: {
            cta: {
              titulo: ctaTitulo,
              texto: ctaTexto, // 🔥 mantém quebra de linha
              label: ctaBotaoTexto,
              url: ctaBotaoUrl,
            },
          },
        },
        { onConflict: "pagina_slug,bloco" }
      );

    if (errorCta) {
      console.error(errorCta);
      setMensagem("Erro ao salvar CTA.");
      return;
    }

    setMensagem("✅ Sobre + CTA salvos com sucesso.");
  }

  if (loading) {
    return <div className="admin-box">Carregando...</div>;
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Sobre + CTA Final</h1>
        <p className="admin-subtitle">
          Edite o bloco institucional e o CTA final.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2>Sobre</h2>

        <label style={{ fontSize: ".9rem", display: "block" }}>
          Título:
          <input
            value={sobreTitulo}
            onChange={(e) => setSobreTitulo(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginTop: 8 }}>
          Texto (use ENTER para novo parágrafo):
          <textarea
            value={sobreTexto}
            onChange={(e) => setSobreTexto(e.target.value)}
            style={textareaStyle}
          />
        </label>

        <h2 style={{ marginTop: 20 }}>CTA</h2>

        <input
          value={ctaTitulo}
          onChange={(e) => setCtaTitulo(e.target.value)}
          style={inputStyle}
          placeholder="Título"
        />

        <textarea
          value={ctaTexto}
          onChange={(e) => setCtaTexto(e.target.value)}
          style={textareaStyle}
          placeholder="Texto (use ENTER para múltiplos parágrafos)"
        />

        <input
          value={ctaBotaoTexto}
          onChange={(e) => setCtaBotaoTexto(e.target.value)}
          style={inputStyle}
          placeholder="Texto do botão"
        />

        <input
          value={ctaBotaoUrl}
          onChange={(e) => setCtaBotaoUrl(e.target.value)}
          style={inputStyle}
          placeholder="URL do botão"
        />

        <button className="admin-button" style={{ marginTop: 16 }}>
          Salvar
        </button>

        {mensagem && <p style={{ marginTop: 10 }}>{mensagem}</p>}
      </form>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e5e7eb",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical" as const,
};
