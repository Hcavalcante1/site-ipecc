"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Org = { id: string; nome: string; slug: string; plano: string; ativo: boolean };

function slugificar(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ContaPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [nomeNovaOrg, setNomeNovaOrg] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: membro } = await supabase
      .from("org_membros")
      .select("organizacoes(id, nome, slug, plano, ativo)")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const o = membro?.organizacoes
      ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as Org)
      : null;
    setOrg(o);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criarOrganizacao(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeNovaOrg.trim()) return;
    setCriando(true);
    setErro("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada, faça login novamente."); setCriando(false); return; }

    const slugBase = slugificar(nomeNovaOrg.trim()) || "org";
    let slug = slugBase;

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const { data: novaOrg, error: orgErr } = await supabase
        .from("organizacoes")
        .insert({ nome: nomeNovaOrg.trim(), slug, plano: "gratuito" })
        .select("id")
        .single();

      if (!orgErr && novaOrg) {
        const { error: membroErr } = await supabase.from("org_membros").insert({
          org_id: novaOrg.id,
          user_id: user.id,
          papel: "owner",
        });
        if (membroErr) {
          setErro(`Organização criada, mas houve um erro ao vincular sua conta: ${membroErr.message}`);
          setCriando(false);
          return;
        }
        await carregar();
        setCriando(false);
        return;
      }

      if (orgErr?.message?.toLowerCase().includes("slug")) {
        slug = `${slugBase}-${tentativa + 2}`;
        continue;
      }

      setErro(orgErr?.message || "Erro ao criar organização.");
      setCriando(false);
      return;
    }

    setErro("Não foi possível gerar um identificador único. Tente outro nome.");
    setCriando(false);
  }

  if (loading) return <div style={s.wrap}><p style={s.loading}>Carregando...</p></div>;

  if (!org) {
    return (
      <div style={s.wrap}>
        <div style={s.onboardCard}>
          <h1 style={s.onboardTitulo}>Bem-vindo(a)!</h1>
          <p style={s.onboardTexto}>
            Você ainda não tem uma organização. Crie a sua para começar a usar a
            plataforma.
          </p>
          <form onSubmit={criarOrganizacao} style={s.form}>
            <input
              type="text"
              placeholder="Nome da sua organização"
              value={nomeNovaOrg}
              onChange={(e) => setNomeNovaOrg(e.target.value)}
              required
              style={s.input}
            />
            <button type="submit" disabled={criando} style={{ ...s.btn, opacity: criando ? 0.7 : 1 }}>
              {criando ? "Criando..." : "Criar organização"}
            </button>
            {erro && <p style={s.erro}>{erro}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <h1 style={s.titulo}>Painel — {org.nome}</h1>
      <p style={s.sub}>Bem-vindo(a) ao painel da sua organização.</p>

      <div style={s.cardsGrid}>
        <div style={s.card}>
          <p style={s.cardLabel}>Plano atual</p>
          <p style={s.cardValor}>{org.plano.charAt(0).toUpperCase() + org.plano.slice(1)}</p>
          <Link href="/conta/faturamento" style={s.cardLink}>Gerenciar plano →</Link>
        </div>
        <div style={s.card}>
          <p style={s.cardLabel}>Equipe</p>
          <p style={s.cardValor}>Convide colaboradores</p>
          <Link href="/conta/membros" style={s.cardLink}>Gerenciar membros →</Link>
        </div>
        <div style={s.card}>
          <p style={s.cardLabel}>Portal público</p>
          <p style={s.cardValor}>/org/{org.slug}</p>
          <a href={`/org/${org.slug}`} target="_blank" rel="noreferrer" style={s.cardLink}>Ver página →</a>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 32, color: "#e5e7eb", maxWidth: 1000 },
  loading: { color: "#64748b" },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 24px", color: "#94a3b8", fontSize: 13 },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "20px 22px" },
  cardLabel: { margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  cardValor: { margin: "6px 0 14px", fontSize: 16, fontWeight: 800, color: "#e2e8f0" },
  cardLink: { fontSize: 13, color: "#93c5fd", fontWeight: 700, textDecoration: "none" },
  onboardCard: { maxWidth: 420, margin: "60px auto", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 20, padding: 36, textAlign: "center" as const },
  onboardTitulo: { margin: "0 0 12px", fontSize: 20, fontWeight: 900, color: "#f1f5f9" },
  onboardTexto: { margin: "0 0 24px", fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: 12, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e5e7eb", fontSize: 14 },
  btn: { padding: 12, borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer" },
  erro: { color: "#f87171", fontSize: 13, margin: 0 },
};
