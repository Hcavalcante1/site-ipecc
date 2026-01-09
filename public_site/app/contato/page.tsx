// app/contato/page.tsx

export default function ContatoPage() {
  return (
    <>
      {/* Tarja degradê que rola com o conteúdo */}
      <section className="hero-rolling" aria-label="Contato APECC">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Contato</h1>
          <p className="hero__text">
            Fale com a APECC para informações institucionais, propostas de parceria,
            cotações e atendimento ao público. Estamos à disposição para colaborar
            com gestores, escolas, OSCs e comunidades.
          </p>
        </div>
      </section>

      {/* Canais oficiais */}
      <section className="sobre" aria-labelledby="canais-oficiais">
        <div className="container">
          <h2 id="canais-oficiais">Canais oficiais</h2>
          <div className="cards__grid" style={{ marginTop: 16 }}>
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Atendimento Geral</h3>
                <p className="card__text">
                  Dúvidas, informações e orientações ao público.
                </p>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><strong>E-mail:</strong> <a className="card__link" href="mailto:contato@apecc.org.br">contato@apecc.org.br</a></li>
                  <li><strong>Telefone:</strong> (11) 0000-0000</li>
                  <li><strong>Horário:</strong> 9h às 17h, dias úteis</li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Parcerias e Editais</h3>
                <p className="card__text">
                  Demandas institucionais, convênios, termos de colaboração e projetos.
                </p>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><strong>E-mail:</strong> <a className="card__link" href="mailto:parcerias@apecc.org.br">parcerias@apecc.org.br</a></li>
                  <li><strong>Telefone:</strong> (11) 0000-0001</li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Cotações e Fornecedores</h3>
                <p className="card__text">
                  Envio de propostas comerciais e documentos de habilitação.
                </p>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><strong>E-mail:</strong> <a className="card__link" href="mailto:cotacoes@apecc.org.br">cotacoes@apecc.org.br</a></li>
                  <li><strong>Checklist:</strong> <a className="card__link" href="/docs/checklist-fornecedor.pdf" target="_blank" rel="noreferrer">baixar PDF</a></li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Endereço e atendimento presencial */}
      <section className="sobre" aria-labelledby="endereco">
        <div className="container">
          <h2 id="endereco">Endereço e atendimento presencial</h2>
          <div className="destaques__grid" style={{ marginTop: 16 }}>
            <article>
              <h3>Escritório / Sede</h3>
              <p className="card__text" style={{ marginBottom: 10 }}>
                Rua Jânio Zaglia, 211 — Centro, Suzano (SP) <br />
                CEP 00000-000
              </p>
              <p className="card__text">
                <strong>Atendimento:</strong> 2ª a 6ª, das 9h às 17h
              </p>
            </article>

            <article>
              <h3>Mapa</h3>
              {/* Substitua o src pelo embed do Google Maps quando desejar */}
              <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
                <img
                  src="/media/mapa-placeholder.jpg"
                  alt="Mapa de localização da APECC"
                  style={{ width: "100%", height: 220, objectFit: "cover" }}
                />
              </div>
              <p style={{ marginTop: 8 }}>
                <a className="card__link" href="https://maps.google.com" target="_blank" rel="noreferrer">
                  Ver no Google Maps
                </a>
              </p>
            </article>

            <article>
              <h3>Documentos e Protocolos</h3>
              <p className="card__text">
                Entrega de documentos mediante protocolo digital ou presencial.
              </p>
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li><a className="card__link" href="mailto:protocolo@apecc.org.br">protocolo@apecc.org.br</a></li>
                <li><a className="card__link" href="/docs/formulario-protocolo.pdf" target="_blank" rel="noreferrer">Formulário de Protocolo (PDF)</a></li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Formulário simples (sem JS, apenas HTML) */}
      <section className="sobre" aria-labelledby="formulario-contato">
        <div className="container">
          <h2 id="formulario-contato">Envie uma mensagem</h2>
          <p>
            Preencha o formulário e retornaremos em até 2 dias úteis. Se preferir,
            utilize os e-mails oficiais acima.
          </p>

          <form
            action="mailto:contato@apecc.org.br"
            method="post"
            encType="text/plain"
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,.08)",
              padding: 16,
              marginTop: 16
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="nome" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Nome</label>
                <input id="nome" name="nome" type="text" required
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }} />
              </div>
              <div>
                <label htmlFor="email" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>E-mail</label>
                <input id="email" name="email" type="email" required
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label htmlFor="assunto" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Assunto</label>
              <input id="assunto" name="assunto" type="text" required
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label htmlFor="mensagem" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Mensagem</label>
              <textarea id="mensagem" name="mensagem" required rows={6}
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                type="submit"
                className="btn-cta"
                style={{ border: "none", cursor: "pointer" }}
                aria-label="Enviar mensagem para a APECC"
              >
                Enviar mensagem
              </button>
            </div>
          </form>

          <p style={{ marginTop: 10, color: "#6b7280" }}>
            Ao enviar, você concorda com nossa <a className="card__link" href="/docs/politica-lgpd.pdf" target="_blank" rel="noreferrer">Política de Privacidade (LGPD)</a>.
          </p>
        </div>
      </section>
    </>
  );
}
