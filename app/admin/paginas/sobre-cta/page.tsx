"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/supabaseClient";

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
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 CARREGAR DO BANCO
  useEffect(() => {
    async function carregar() {
      // SOBRE
      const sobreData = await fetchPaginaConteudo(supabase, "home", "sobre");

      if (sobreData) {
        setSobreTitulo(sobreData.titulo || "Sobre o IPECC");
        setSobreTexto(sobreData.texto || "");
      }

      // CTA
      const ctaData = await fetchPaginaConteudo(supabase, "home", "cta_final", "extra");
      const cta = parsePaginaExtra<{
        cta?: { titulo?: string; texto?: string; label?: string; url?: string };
      }>(ctaData?.extra, {}).cta;

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

  async function salvar() {
    setMensagem("Salvando...");
    setSalvando(true);

    try {
    // SOBRE
    const { error: errorSobre } = await upsertPaginaConteudo(supabase, {
      pagina_slug: "home",
      bloco: "sobre",
      titulo: sobreTitulo,
      texto: sobreTexto, // 🔥 mantém quebra de linha
    });

    if (errorSobre) {
      console.error(errorSobre);
      setMensagem(`Erro ao salvar Sobre: ${errorSobre.message}`);
      return;
    }

    // CTA
    const { error: errorCta } = await upsertPaginaConteudo(supabase, {
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
    });

    if (errorCta) {
      console.error(errorCta);
      setMensagem(`Erro ao salvar CTA: ${errorCta.message}`);
      return;
    }

    setMensagem("Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
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

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
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

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

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
