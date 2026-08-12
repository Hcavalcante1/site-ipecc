"use client";

import Link from "next/link";

const PLANOS = [
  {
    id: "gratuito",
    nome: "Gratuito",
    preco: "R$ 0",
    periodo: "",
    destaque: false,
    paraQuem: "Para institutos que estão começando e querem conhecer a plataforma sem compromisso.",
    recursos: [
      "Até 3 editais ativos",
      "Até 50 propostas recebidas",
      "1 token de portal do financiador",
      "CMS do site institucional",
      "Suporte por e-mail",
    ],
    cta: "Começar grátis",
    href: "/cadastro",
  },
  {
    id: "starter",
    nome: "Starter",
    preco: "R$ 190",
    periodo: "/mês",
    destaque: true,
    paraQuem: "Para ONGs e institutos em operação regular, com editais frequentes e equipe pequena.",
    recursos: [
      "Até 20 editais ativos",
      "Até 500 propostas recebidas",
      "Até 500 beneficiários cadastrados",
      "10 tokens de portal do financiador",
      "Gestão documental com assinatura digital",
      "CMS completo do site institucional",
      "Suporte prioritário",
    ],
    cta: "Assinar Starter",
    href: "/cadastro",
  },
  {
    id: "profissional",
    nome: "Profissional",
    preco: "R$ 490",
    periodo: "/mês",
    destaque: false,
    paraQuem: "Para organizações com alto volume de operações, múltiplos projetos e necessidade de API.",
    recursos: [
      "Editais, propostas e beneficiários ilimitados",
      "5 tokens de API",
      "50 tokens de portal do financiador",
      "Módulo Digital (IA para redes sociais)",
      "WhatsApp integrado",
      "Relatórios e trilha de auditoria",
      "Suporte dedicado",
    ],
    cta: "Assinar Profissional",
    href: "/cadastro",
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "",
    destaque: false,
    paraQuem: "Para redes de institutos ou organizações com necessidades próprias de infraestrutura e contrato.",
    recursos: [
      "Tudo do Profissional",
      "API ilimitada",
      "Portal white-label com sua identidade visual",
      "Onboarding assistido pela equipe IPECC",
      "Multi-organização (gestão centralizada)",
      "SLA e contrato dedicados",
    ],
    cta: "Falar com a equipe",
    href: "mailto:contato@ipecc.org.br",
  },
];

const FUNCIONALIDADES = [
  {
    icone: "📋",
    titulo: "Editais e Propostas",
    descricao:
      "Publique chamadas estruturadas, defina fases, documentos e critérios. Receba e avalie propostas num painel centralizado com trilha completa de auditoria.",
  },
  {
    icone: "🌐",
    titulo: "CMS do Site Institucional",
    descricao:
      "Gerencie todo o conteúdo do seu site — textos, hero, projetos, notícias, eventos, transparência e editais públicos — sem precisar de desenvolvedor.",
  },
  {
    icone: "✍️",
    titulo: "Gestão Documental com Assinatura",
    descricao:
      "Assine documentos digitalmente com validade jurídica. Crie fluxos de aprovação, assine em lote e gerencie todo o acervo documental da organização.",
  },
  {
    icone: "👥",
    titulo: "Beneficiários e Relatórios",
    descricao:
      "Cadastre e acompanhe as pessoas atendidas pelos projetos. Gere relatórios prontos para prestação de contas, convênios e auditorias externas.",
  },
  {
    icone: "🔒",
    titulo: "Transparência e LGPD",
    descricao:
      "Seção de transparência pública com convênios, prestação de contas e documentos. Gestão de solicitações LGPD integrada e trilha de auditoria completa.",
  },
  {
    icone: "🤝",
    titulo: "Portal do Financiador",
    descricao:
      "Dê aos seus financiadores e parceiros um portal dedicado para acompanhar editais, projetos e metas em tempo real — com ou sem identidade visual própria.",
  },
  {
    icone: "📱",
    titulo: "Digital e Redes Sociais",
    descricao:
      "Gere e publique conteúdo para redes sociais com auxílio de IA. Agende posts, gerencie mídias e acompanhe o desempenho direto do painel.",
  },
  {
    icone: "💬",
    titulo: "WhatsApp Integrado",
    descricao:
      "Centralize leads e conversas do WhatsApp no painel. Atenda parceiros, financiadores e candidatos a editais sem sair do sistema.",
  },
];

export default function PlanosPage() {
  return (
    <div className="public-content public-content--detail">
      <div className="public-content__inner">

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.1em", marginBottom: 14, textTransform: "uppercase" }}>
            Plataforma IPECC
          </p>
          <h1 style={{ margin: "0 0 18px", fontSize: 34, fontWeight: 900, lineHeight: 1.2 }}>
            Uma plataforma completa para<br />institutos e ONGs
          </h1>
          <p style={{ margin: "0 auto 28px", maxWidth: 600, fontSize: 16, lineHeight: 1.7, opacity: 0.75 }}>
            Do edital ao beneficiário, do site ao portal do financiador — a plataforma IPECC
            centraliza a gestão institucional, a transparência pública e a comunicação da
            sua organização num único lugar.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/cadastro"
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                background: "#1d4ed8",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Criar conta grátis
            </Link>
            <a
              href="mailto:contato@ipecc.org.br"
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.35)",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              Falar com a equipe
            </a>
          </div>
        </div>

        {/* Funcionalidades */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>
            Tudo que sua organização precisa
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 32px", fontSize: 14, opacity: 0.6 }}>
            Todos os planos pagos dão acesso ao conjunto completo de ferramentas abaixo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {FUNCIONALIDADES.map((f) => (
              <div
                key={f.titulo}
                style={{
                  background: "rgba(148,163,184,0.04)",
                  border: "1px solid rgba(148,163,184,0.12)",
                  borderRadius: 14,
                  padding: "20px 20px 22px",
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icone}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800 }}>{f.titulo}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.68 }}>{f.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Planos */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>
            Escolha o plano da sua organização
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 32px", fontSize: 14, opacity: 0.6 }}>
            Comece gratuitamente. Faça upgrade quando precisar de mais volume ou recursos.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {PLANOS.map((p) => (
              <div
                key={p.id}
                style={{
                  border: p.destaque ? "2px solid #1d4ed8" : "1px solid rgba(148,163,184,0.25)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  background: p.destaque ? "rgba(29,78,216,0.06)" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  position: "relative",
                }}
              >
                {p.destaque && (
                  <span style={{ position: "absolute", top: -12, left: 24, background: "#1d4ed8", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                    Mais popular
                  </span>
                )}
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{p.nome}</h3>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 900 }}>{p.preco}</span>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>{p.periodo}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, opacity: 0.65 }}>{p.paraQuem}</p>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {p.recursos.map((r) => (
                    <li key={r} style={{ fontSize: 13.5, display: "flex", gap: 8 }}>
                      <span aria-hidden style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "11px 0",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                    textDecoration: "none",
                    background: p.destaque ? "#1d4ed8" : "transparent",
                    color: p.destaque ? "#fff" : "inherit",
                    border: p.destaque ? "none" : "1px solid rgba(148,163,184,0.35)",
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ borderTop: "1px solid rgba(148,163,184,0.12)", paddingTop: 44, marginBottom: 16 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 32px", fontSize: 20, fontWeight: 900 }}>Dúvidas frequentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 680, margin: "0 auto" }}>
            {[
              { p: "Posso trocar de plano depois?", r: "Sim. Upgrade e downgrade podem ser feitos a qualquer momento pelo painel. A mudança entra no próximo ciclo de cobrança." },
              { p: "O plano gratuito tem limite de tempo?", r: "Não. O plano Gratuito é permanente — você só paga se optar por um plano pago." },
              { p: "O que é o token de portal do financiador?", r: "É um acesso exclusivo que você entrega ao seu financiador ou parceiro para acompanhar editais, projetos e indicadores direto na plataforma, sem precisar de login administrativo." },
              { p: "A assinatura digital tem validade jurídica?", r: "Sim. A plataforma suporta assinatura simples, avançada e por certificado digital (ICP-Brasil), cobrindo todos os requisitos legais para documentos institucionais." },
              { p: "O módulo de transparência precisa de configuração extra?", r: "Não. A seção de transparência do seu site é alimentada automaticamente pelo painel admin — convênios, prestação de contas e documentos públicos são publicados em poucos cliques." },
              { p: "Como funciona o suporte?", r: "Gratuito: e-mail em até 5 dias úteis. Starter e Profissional: prioritário (1 dia útil). Enterprise: atendimento dedicado com SLA definido em contrato." },
            ].map((item) => (
              <div key={item.p} style={{ borderBottom: "1px solid rgba(148,163,184,0.08)", paddingBottom: 20 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 14 }}>{item.p}</p>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, opacity: 0.7 }}>{item.r}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.6, marginTop: 36 }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ fontWeight: 700 }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
