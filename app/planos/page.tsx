"use client";

import Link from "next/link";

const PLANOS = [
  {
    id: "gratuito",
    nome: "Gratuito",
    preco: "R$ 0",
    periodo: "",
    destaque: false,
    recursos: [
      "Até 3 editais",
      "Até 50 propostas",
      "1 token de portal",
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
    recursos: [
      "Até 20 editais",
      "Até 500 propostas",
      "Até 500 beneficiários",
      "10 tokens de portal",
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
    recursos: [
      "Editais e propostas ilimitados",
      "Beneficiários ilimitados",
      "5 tokens de API",
      "50 tokens de portal",
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
    recursos: [
      "Tudo do Profissional",
      "Tokens de API ilimitados",
      "Portal white-label",
      "Onboarding assistido",
      "SLA dedicado",
    ],
    cta: "Falar com a equipe",
    href: "mailto:contato@ipecc.org.br",
  },
];

export default function PlanosPage() {
  return (
    <div className="public-content public-content--detail">
      <div className="public-content__inner">
        <p className="public-page-lead" style={{ textAlign: "center" }}>
          Escolha o plano ideal para sua organização gerenciar editais, propostas e
          beneficiários na plataforma IPECC.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginTop: 32,
          }}
        >
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
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 24,
                    background: "#1d4ed8",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 999,
                  }}
                >
                  Mais popular
                </span>
              )}
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{p.nome}</h3>
                <div>
                  <span style={{ fontSize: 26, fontWeight: 900 }}>{p.preco}</span>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{p.periodo}</span>
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.recursos.map((r) => (
                  <li key={r} style={{ fontSize: 13.5, display: "flex", gap: 8 }}>
                    <span aria-hidden>✓</span>
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

        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.65, marginTop: 32 }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ fontWeight: 700 }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
