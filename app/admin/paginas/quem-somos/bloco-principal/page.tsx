"use client";

import { useState, useEffect } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

export default function QuemSomosBlocoPrincipalAdminPage() {
  const [titulo, setTitulo] = useState(
    "Educação, Cultura e Cidadania como caminho de transformação"
  );
  const [texto1, setTexto1] = useState(
    "Somos uma organização da sociedade civil que acredita no poder das ações coletivas para transformar realidades. Atuamos como elo entre o poder público, instituições parceiras e a sociedade civil, articulando projetos de impacto social que unem educação, arte, cultura e participação social."
  );
  const [texto2, setTexto2] = useState(
    "Nosso propósito é tornar a cidadania uma experiência viva e acessível, com iniciativas que capacitam pessoas, fortalecem redes locais e promovem desenvolvimento humano em todas as suas dimensões."
  );
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,.8)",
    background: "rgba(15,23,42,.85)",
    color: "#e6edf3",
    fontSize: ".9rem",
  };

  const textAreaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 120,
  };

  // ✅ CARREGAR DADOS DO BANCO
  useEffect(() => {
    async function loadData() {
      const data = await fetchPaginaConteudo(
        supabase,
        "quem-somos",
        "bloco-principal",
        "titulo, texto"
      );

      if (data) {
        setTitulo(data.titulo || "");

        const partes = data.texto ? data.texto.split(/\r?\n\s*\r?\n/) : [];
        setTexto1(partes[0] || "");
        setTexto2(partes.slice(1).join("\n\n") || "");
      }
    }

    loadData();
  }, []);

  // ✅ SALVAR NO BANCO
  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);

    try {
      const texto = [texto1, texto2]
        .map((parte) => parte.trim())
        .filter(Boolean)
        .join("\n\n");

      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "quem-somos",
        bloco: "bloco-principal",
        titulo,
        texto,
      });

      if (error) throw error;

      setMsg("Salvo com sucesso.");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos — Bloco principal</h1>
        <p className="admin-subtitle">
          Edite o título e os parágrafos centrais de apresentação do IPECC.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>Título do bloco:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={inputStyle}
        />

        <label style={{ marginTop: 10 }}>1º parágrafo:</label>
        <textarea
          value={texto1}
          onChange={(e) => setTexto1(e.target.value)}
          style={textAreaStyle}
        />

        <label style={{ marginTop: 10 }}>2º parágrafo:</label>
        <textarea
          value={texto2}
          onChange={(e) => setTexto2(e.target.value)}
          style={textAreaStyle}
        />

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {msg && (
          <p style={{ marginTop: 10, color: "#bbf7d0", fontSize: ".8rem" }}>
            {msg}
          </p>
        )}
      </form>
    </>
  );
}
