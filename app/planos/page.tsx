"use client";

import Link from "next/link";

// ─── Preços provisórios — atualize aqui quando definidos ───────────────────
const MODULOS = [
  {
    id: "editais",
    nome: "Editais",
    icone: "📋",
    preco: null, // null = "sob consulta"
    descricao:
      "Publique chamadas públicas estruturadas com fases, critérios, documentos exigidos e governança. Controle o ciclo completo do edital.",
    limitacaoGratuito: "Até 3 editais ativos",
  },
  {
    id: "propostas",
    nome: "Propostas",
    icone: "📨",
    preco: null,
    descricao:
      "Receba, organize e avalie propostas num painel centralizado. Trilha de auditoria completa para cada submissão.",
    limitacaoGratuito: "Até 50 propostas recebidas",
  },
  {
    id: "documentos",
    nome: "Gestão Documental",
    icone: "✍️",
    preco: null,
    descricao:
      "Assine documentos digitalmente (simples, avançada ou ICP-Brasil). Crie fluxos de aprovação, assine em lote e gerencie o acervo completo.",
    limitacaoGratuito: "Acesso limitado (visualização)",
  },
  {
    id: "beneficiarios",
    nome: "Beneficiários",
    icone: "👥",
    preco: null,
    descricao:
      "Cadastre e acompanhe as pessoas atendidas pelos seus projetos. Gere relatórios prontos para prestação de contas e auditorias.",
    limitacaoGratuito: "Até 20 beneficiários",
  },
  {
    id: "transparencia",
    nome: "Transparência",
    icone: "🔒",
    preco: null,
    descricao:
      "Publique convênios, prestação de contas e documentos no site com um clique. Gestão de solicitações LGPD integrada.",
    limitacaoGratuito: "Somente leitura",
  },
  {
    id: "paginas",
    nome: "CMS do Site",
    icone: "🌐",
    preco: null,
    descricao:
      "Edite todo o conteúdo do seu site institucional — textos, hero, projetos, notícias, eventos — sem depender de desenvolvedor.",
    limitacaoGratuito: "Somente visualização",
  },
  {
    id: "noticias",
    nome: "Notícias e Eventos",
    icone: "📰",
    preco: null,
    descricao:
      "Publique notícias, comunicados e eventos diretamente no site. Agendamento, categorias e controle de visibilidade.",
    limitacaoGratuito: "Até 5 publicações",
  },
  {
    id: "digital",
    nome: "Digital e IA",
    icone: "📱",
    preco: null,
    descricao:
      "Gere e publique conteúdo para redes sociais com IA. Agende posts, gerencie mídias e acompanhe o desempenho direto do painel.",
    limitacaoGratuito: "Não disponível",
  },
  {
    id: "whatsapp",
    nome: "WhatsApp",
    icone: "💬",
    preco: null,
    descricao:
      "Centralize leads e conversas do WhatsApp no painel. Atenda parceiros, financiadores e candidatos a editais em um só lugar.",
    limitacaoGratuito: "Não disponível",
  },
  {
    id: "portal",
    nome: "Portal do Financiador",
    icone: "🤝",
    preco: null,
    descricao:
      "Dê aos seus financiadores um acesso dedicado para acompanhar editais, projetos e indicadores em tempo real.",
    limitacaoGratuito: "1 token de acesso",
  },
  {
    id: "certidoes",
    nome: "Certidões",
    icone: "📜",
    preco: null,
    descricao:
      "Emita e gerencie certidões institucionais com controle de validade, assinatura digital e histórico de emissões.",
    limitacaoGratuito: "Não disponível",
  },
  {
    id: "logs",
    nome: "Registros e Auditoria",
    icone: "🗂️",
    preco: null,
    descricao:
      "Acesse o histórico completo de ações da equipe — quem fez o quê e quando. Essencial para compliance e prestação de contas.",
    limitacaoGratuito: "Últimos 7 dias",
  },
];

export default function PlanosPage() {
  return (
    <div className="public-content public-content--detail">
      <div className="public-content__inner">

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.12em", marginBottom: 14, textTransform: "uppercase" }}>
            Plataforma IPECC
          </p>
          <h1 style={{ margin: "0 0 18px", fontSize: 34, fontWeight: 900, lineHeight: 1.2 }}>
            Assine só o que sua organização<br />realmente precisa
          </h1>
          <p style={{ margin: "0 auto 32px", maxWidth: 580, fontSize: 16, lineHeight: 1.7, opacity: 0.75 }}>
            A plataforma IPECC funciona por módulos independentes. Você começa
            gratuitamente, conhece tudo com limitações e ativa — ou desativa — cada
            módulo conforme a necessidade da sua organização.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/cadastro"
              style={{ padding: "12px 28px", borderRadius: 10, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
            >
              Começar grátis
            </Link>
            <a
              href="mailto:contato@ipecc.org.br"
              style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.35)", fontWeight: 700, fontSize: 14, textDecoration: "none", color: "inherit" }}
            >
              Montar meu plano com a equipe
            </a>
          </div>
        </div>

        {/* Como funciona */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 52,
          }}
        >
          {[
            { n: "1", titulo: "Crie sua conta", desc: "Cadastro gratuito em 2 minutos. Nenhum cartão exigido." },
            { n: "2", titulo: "Explore com o plano gratuito", desc: "Acesse todos os módulos com limitações — sem pressa." },
            { n: "3", titulo: "Ative os módulos que precisa", desc: "Cada módulo é uma assinatura independente. Cancele quando quiser." },
            { n: "4", titulo: "Escale conforme cresce", desc: "Adicione ou remova módulos a qualquer momento pelo painel." },
          ].map((etapa) => (
            <div
              key={etapa.n}
              style={{
                background: "rgba(148,163,184,0.04)",
                border: "1px solid rgba(148,163,184,0.10)",
                borderRadius: 14,
                padding: "20px 20px 22px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(29,78,216,0.15)",
                  border: "1px solid rgba(29,78,216,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#93c5fd",
                  marginBottom: 12,
                }}
              >
                {etapa.n}
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800 }}>{etapa.titulo}</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, opacity: 0.65 }}>{etapa.desc}</p>
            </div>
          ))}
        </div>

        {/* Plano gratuito */}
        <div
          style={{
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 16,
            padding: "28px 28px 24px",
            background: "rgba(34,197,94,0.04)",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Plano gratuito — permanente
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>Conheça a plataforma sem compromisso</h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, opacity: 0.7, maxWidth: 540 }}>
                Ao criar sua conta você já tem acesso a todos os módulos com limitações.
                Não é um trial com prazo — é gratuito para sempre. Ative módulos pagos
                somente quando estiver pronto.
              </p>
            </div>
            <Link
              href="/cadastro"
              style={{ padding: "11px 24px", borderRadius: 10, background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13.5, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Criar conta grátis →
            </Link>
          </div>
        </div>

        {/* Módulos */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>
            Módulos disponíveis
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 32px", fontSize: 14, opacity: 0.6 }}>
            Cada módulo é uma assinatura independente. Ative, pause ou cancele a qualquer momento.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {MODULOS.map((m) => (
              <div
                key={m.id}
                style={{
                  border: "1px solid rgba(148,163,184,0.18)",
                  borderRadius: 14,
                  padding: "22px 22px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.icone}</span>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{m.nome}</h3>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748b",
                      whiteSpace: "nowrap",
                      paddingLeft: 8,
                    }}
                  >
                    Sob consulta
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.68, flex: 1 }}>{m.descricao}</p>

                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    background: "rgba(148,163,184,0.06)",
                    border: "1px solid rgba(148,163,184,0.1)",
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#94a3b8" }}>Grátis:</span> {m.limitacaoGratuito}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA de montagem */}
        <div
          style={{
            textAlign: "center",
            border: "1px solid rgba(29,78,216,0.25)",
            borderRadius: 16,
            padding: "36px 28px",
            background: "rgba(29,78,216,0.04)",
            marginBottom: 52,
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 900 }}>
            Quer ajuda para montar o plano certo?
          </h2>
          <p style={{ margin: "0 auto 24px", maxWidth: 480, fontSize: 14, lineHeight: 1.65, opacity: 0.7 }}>
            Nossa equipe pode ajudar a identificar quais módulos fazem mais sentido
            para o porte e as necessidades da sua organização — sem pressão.
          </p>
          <a
            href="mailto:contato@ipecc.org.br"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              borderRadius: 10,
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Falar com a equipe →
          </a>
        </div>

        {/* FAQ */}
        <div style={{ borderTop: "1px solid rgba(148,163,184,0.12)", paddingTop: 44, marginBottom: 16 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 32px", fontSize: 20, fontWeight: 900 }}>Dúvidas frequentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 680, margin: "0 auto" }}>
            {[
              {
                p: "Posso ativar e desativar módulos a qualquer momento?",
                r: "Sim. Cada módulo é uma assinatura independente. Você ativa quando precisar e cancela quando não precisar mais — sem fidelidade mínima.",
              },
              {
                p: "O plano gratuito tem prazo?",
                r: "Não. O plano gratuito é permanente. Você acessa todos os módulos com limitações de volume e, quando quiser mais capacidade, ativa o módulo correspondente.",
              },
              {
                p: "Como funciona o acesso após ativar um módulo?",
                r: "O acesso é liberado automaticamente no painel após a confirmação do pagamento. Não é necessário aguardar aprovação manual.",
              },
              {
                p: "A assinatura é por módulo ou por Usuário?",
                r: "Por módulo. Todos os membros da sua organização têm acesso ao módulo ativado, dentro das permissões configuradas no painel de acessos.",
              },
              {
                p: "Como é feita a cobrança?",
                r: "Mensalmente, via Pix, boleto ou cartão. Você recebe a fatura no painel e pode baixar o comprovante para prestação de contas.",
              },
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
