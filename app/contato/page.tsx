"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling } from "@/components/public";
import PublicWhatsAppCtaLink from "@/components/public/PublicWhatsAppCtaLink";

type HeroBlock = {
  titulo?: string | null;
  texto?: string | null;
};

type CanalItem = {
  label?: string;
  valor?: string;
  tipo?: "email" | "link" | "texto";
};

type CanalCard = {
  titulo?: string;
  descricao?: string;
  itens?: CanalItem[];
};

type CanaisOficiais = {
  titulo?: string;
  cards?: CanalCard[];
};

type EnderecoExtra = {
  mapa_url?: string;
  horario?: string;
};

type EnderecoBlock = {
  titulo?: string | null;
  texto?: string | null;
  extra?: EnderecoExtra | string | null;
};

type CtaExtra = {
  descricao?: string;
  botao_link?: string;
  botao_texto?: string;
};

type CtaBlock = {
  titulo?: string | null;
  texto?: string | null;
  extra?: CtaExtra | string | null;
};

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  mensagem: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  email: "",
  telefone: "",
  mensagem: "",
};

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  width: "100%",
  fontSize: "1rem",
  color: "#111827",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  fontWeight: 600,
  color: "#0b2a6b",
};

function parseObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") return value as T;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function safeText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function ContatoPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hero, setHero] = useState<HeroBlock | null>(null);
  const [canais, setCanais] = useState<CanaisOficiais | null>(null);
  const [endereco, setEndereco] = useState<EnderecoBlock | null>(null);
  const [cta, setCTA] = useState<CtaBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [formMsgType, setFormMsgType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        { data: heroData },
        { data: paginaData },
        { data: enderecoData },
        { data: ctaData },
      ] = await Promise.all([
        supabase
          .from("paginas_conteudo")
          .select("titulo, texto")
          .eq("pagina_slug", "contato")
          .eq("bloco", "hero")
          .order("created_at", { ascending: false })
          .limit(1),

        supabase
          .from("paginas")
          .select("canais_oficiais")
          .eq("slug", "contato")
          .maybeSingle(),

        supabase
          .from("paginas_conteudo")
          .select("titulo, texto, extra")
          .eq("pagina_slug", "contato")
          .eq("bloco", "endereco")
          .order("created_at", { ascending: false })
          .limit(1),

        supabase
          .from("paginas_conteudo")
          .select("titulo, texto, extra")
          .eq("pagina_slug", "contato")
          .eq("bloco", "cta")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setHero((heroData?.[0] as HeroBlock) || null);
      setCanais((paginaData?.canais_oficiais as CanaisOficiais) ?? null);
      setEndereco((enderecoData?.[0] as EnderecoBlock) || null);
      setCTA((ctaData?.[0] as CtaBlock) || null);
      setLoading(false);
    }

    load();
  }, []);

  const enderecoExtra = useMemo(
    () => parseObject<EnderecoExtra>(endereco?.extra, {}),
    [endereco]
  );

  const ctaExtra = useMemo(
    () => parseObject<CtaExtra>(cta?.extra, {}),
    [cta]
  );

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!safeText(form.nome) || !safeText(form.email) || !safeText(form.mensagem)) {
      setFormMsgType("error");
      setFormMsg("Preencha nome, e-mail e mensagem para enviar.");
      return;
    }

    setSending(true);
    setFormMsg("");
    setFormMsgType("");

    const { error } = await supabase.from("contato_mensagens").insert([
      {
        nome: safeText(form.nome),
        email: safeText(form.email),
        telefone: safeText(form.telefone) || null,
        mensagem: safeText(form.mensagem),
      },
    ]);

    if (error) {
      setSending(false);
      setFormMsgType("error");
      setFormMsg("Não foi possível enviar sua mensagem agora. Tente novamente.");
      return;
    }

    setForm(EMPTY_FORM);
    setSending(false);
    setFormMsgType("success");
    setFormMsg("Mensagem enviada com sucesso. Retornaremos em breve.");
  }

  const mapaUrl = safeText(enderecoExtra?.mapa_url);
  const horario = safeText(enderecoExtra?.horario);

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/contato/hero.webp"
        title={hero?.titulo ?? "Contato"}
        text={
          hero?.texto ??
          "Fale com a equipe do IPECC para informações institucionais, parcerias, projetos e atendimento."
        }
      />

      <section className="sobre" style={{ marginTop: 60 }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: 40 }}>
            {canais?.titulo ?? "Canais oficiais"}
          </h2>

          <div className="cards__grid">
            {(canais?.cards ?? []).map((card, i) => (
              <article key={i} className="card">
                <div className="card__body" style={{ padding: "18px 18px 20px" }}>
                  <h3 className="card__title">{card.titulo}</h3>
                  {safeText(card.descricao) && (
                    <p className="card__text">{card.descricao}</p>
                  )}

                  <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.8 }}>
                    {(card.itens ?? []).map((item, j) => {
                      const valor = safeText(item.valor);
                      const label = safeText(item.label);

                      return (
                        <li key={j}>
                          {label && <strong>{label}:</strong>}{" "}
                          {item.tipo === "email" && valor ? (
                            <a className="card__link" href={`mailto:${valor}`}>
                              {valor}
                            </a>
                          ) : item.tipo === "link" && valor ? (
                            <PublicWhatsAppCtaLink
                              href={valor}
                              className="card__link"
                            >
                              {valor}
                            </PublicWhatsAppCtaLink>
                          ) : (
                            valor
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sobre" style={{ marginTop: 60 }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: 40 }}>
            {endereco?.titulo ?? "Endereço e atendimento"}
          </h2>

          <div
            className="card"
            style={{
              padding: 32,
              marginBottom: 28,
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 15, color: "#0b2a6b", fontSize: "1.2rem", fontWeight: 800 }}>
              Escritório / Sede
            </h3>

            <p className="card__text" style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
              {endereco?.texto ?? ""}
            </p>

            {horario && (
              <p style={{ marginTop: 14, fontWeight: 600, color: "#0b2a6b" }}>
                Horário de atendimento: {horario}
              </p>
            )}
          </div>

          {mapaUrl && (
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,.08)",
              }}
            >
              <iframe
                src={mapaUrl}
                title="Mapa de localização do IPECC"
                width="100%"
                height="500"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </section>

      <section className="sobre" style={{ marginTop: 60 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 style={{ textAlign: "center", marginBottom: 15 }}>
            Envie uma mensagem
          </h2>

          <p style={{ textAlign: "center", marginBottom: 40, color: "#4b5563", lineHeight: 1.7 }}>
            Preencha o formulário abaixo e retornaremos em até 2 dias úteis.
          </p>

          <form
            onSubmit={enviar}
            style={{
              background: "#fff",
              padding: 40,
              borderRadius: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ display: "grid", gap: 20 }}>
              <label style={labelStyle}>
                Nome
                <input
                  placeholder="Digite seu nome"
                  style={inputStyle}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>

              <label style={labelStyle}>
                E-mail
                <input
                  type="email"
                  placeholder="Digite seu e-mail"
                  style={inputStyle}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label style={labelStyle}>
                Telefone
                <input
                  placeholder="Digite seu telefone"
                  style={inputStyle}
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </label>

              <label style={labelStyle}>
                Mensagem
                <textarea
                  rows={6}
                  placeholder="Escreva sua mensagem"
                  style={{ ...inputStyle, resize: "vertical" }}
                  value={form.mensagem}
                  onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                />
              </label>

              {formMsg && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background:
                      formMsgType === "success"
                        ? "rgba(16,185,129,.10)"
                        : "rgba(239,68,68,.10)",
                    color: formMsgType === "success" ? "#065f46" : "#991b1b",
                    border:
                      formMsgType === "success"
                        ? "1px solid rgba(16,185,129,.20)"
                        : "1px solid rgba(239,68,68,.20)",
                    fontWeight: 600,
                  }}
                >
                  {formMsg}
                </div>
              )}

              <button
                className="btn-cta"
                type="submit"
                disabled={sending || loading}
                style={{
                  border: "none",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.8 : 1,
                  justifySelf: "flex-start",
                }}
              >
                {sending ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
            Ao enviar sua mensagem, você concorda com nossa política de proteção de dados.
          </p>
        </div>
      </section>

      <section className="sobre-cta" style={{ marginTop: 100 }}>
        <div className="container sobre-cta__grid">
          <div className="cta-left">
            <h2>
              {cta?.titulo ?? "Quer falar diretamente com nossa equipe?"}
            </h2>

            <p style={{ marginTop: 10 }}>
              {cta?.texto ??
                "Estamos abertos a parcerias institucionais, cooperações técnicas e novas iniciativas sociais."}
            </p>
          </div>

          <div className="cta-green__inner">
            <h3>Fale conosco</h3>

            <p style={{ margin: "10px 0" }}>
              {ctaExtra?.descricao ?? ""}
            </p>

            <PublicWhatsAppCtaLink
              href={ctaExtra?.botao_link || "/contato"}
              className="btn-cta"
              style={{
                width: "fit-content",
                display: "inline-block",
              }}
            >
              {ctaExtra?.botao_texto || "Entrar em contato"}
            </PublicWhatsAppCtaLink>
          </div>
        </div>
      </section>
    </>
  );
}
