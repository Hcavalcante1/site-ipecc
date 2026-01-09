// app/admin/paginas/sobre-cta/page.tsx
"use client";

import { useState } from "react";

export default function SobreCtaPage() {
  const [sobreTitulo, setSobreTitulo] = useState("Sobre a APECC");
  const [sobreTexto, setSobreTexto] = useState(
    "A APECC desenvolve projetos com foco em impacto social, transparência e fortalecimento das políticas públicas por meio da participação cidadã. Atuamos em rede com parceiros institucionais para ampliar o acesso à educação, à cultura e à cidadania."
  );

  const [ctaTitulo, setCtaTitulo] = useState("Junte-se a nós");
  const [ctaTexto, setCtaTexto] = useState(
    "Faça parte da nossa rede de parceiros e voluntariado. Sua colaboração pode transformar vidas e comunidades."
  );
  const [ctaBotaoTexto, setCtaBotaoTexto] = useState("Entre em contato");
  const [ctaBotaoUrl, setCtaBotaoUrl] = useState("/contato");

  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Sobre + CTA:", {
      sobreTitulo,
      sobreTexto,
      ctaTitulo,
      ctaTexto,
      ctaBotaoTexto,
      ctaBotaoUrl,
    });
    setMensagem(
      "Alterações de Sobre + CTA salvas (simulado). Depois vamos enviar isso para o Firebase."
    );
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Sobre + CTA Final</h1>
        <p className="admin-subtitle">
          Edite o texto da seção “Sobre a APECC” e o bloco verde de chamada para
          ação.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Bloco “Sobre a APECC”</h2>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Título:
          <input
            type="text"
            value={sobreTitulo}
            onChange={(e) => setSobreTitulo(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
            }}
          />
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 16 }}>
          Texto:
          <textarea
            rows={4}
            value={sobreTexto}
            onChange={(e) => setSobreTexto(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
              resize: "vertical",
            }}
          />
        </label>

        <h2 style={{ marginTop: 0 }}>Bloco CTA Final (verde)</h2>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Título:
          <input
            type="text"
            value={ctaTitulo}
            onChange={(e) => setCtaTitulo(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
            }}
          />
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Texto:
          <textarea
            rows={3}
            value={ctaTexto}
            onChange={(e) => setCtaTexto(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ fontSize: ".9rem" }}>
            Texto do botão:
            <input
              type="text"
              value={ctaBotaoTexto}
              onChange={(e) => setCtaBotaoTexto(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,.8)",
                background: "rgba(15,23,42,.85)",
                color: "#e5e7eb",
              }}
            />
          </label>

          <label style={{ fontSize: ".9rem" }}>
            URL do botão:
            <input
              type="text"
              value={ctaBotaoUrl}
              onChange={(e) => setCtaBotaoUrl(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,.8)",
                background: "rgba(15,23,42,.85)",
                color: "#e5e7eb",
              }}
            />
          </label>
        </div>

        <button type="submit" className="admin-button" style={{ marginTop: 16 }}>
          Salvar alterações
        </button>

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: ".85rem", color: "#bbf7d0" }}>
            {mensagem}
          </p>
        )}
      </form>
    </>
  );
}
