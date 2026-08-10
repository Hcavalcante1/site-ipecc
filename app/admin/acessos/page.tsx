"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { triggerToast } from "@/components/AdminToast";
import { supabase } from "@/lib/supabaseClient";
import type { AdminPapel } from "@/lib/auth/adminEscopo";
import {
  ORDEM_TIPO_PROCESSO,
  chipsModulosEscopo,
  labelProcessoCompleto,
  labelTipoProcesso,
} from "@/lib/auth/processoLabels";

type Perfil = {
  user_id: string;
  email?: string | null;
  papel: AdminPapel;
  ativo: boolean;
};

type Processo = {
  id: string;
  titulo: string;
  tipo?: string | null;
  status: string;
};

type Escopo = {
  id: string;
  user_id: string;
  processo_id: string | null;
  modalidade: string | null;
  mod_editais: boolean;
  mod_propostas: boolean;
  mod_transparencia: boolean;
  mod_noticias: boolean;
  mod_eventos: boolean;
  mod_projetos: boolean;
  mod_digital?: boolean;
  mod_documentos?: boolean;
};

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid rgba(134, 239, 172, 0.35)",
  background: "rgba(22, 163, 74, 0.12)",
  color: "#86efac",
  fontSize: 11,
  fontWeight: 600,
  marginRight: 6,
  marginTop: 4,
};

type Convite = {
  id: string;
  email: string;
  papel: string;
  aceito_em: string | null;
  expires_at: string;
  created_at: string;
};

export default function AdminAcessosPage() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [escopos, setEscopos] = useState<Escopo[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [convites, setConvites] = useState<Convite[]>([]);
  const [conviteEmail, setConviteEmail] = useState("");
  const [convitePapel, setConvitePapel] = useState("operador");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<AdminPapel>("externo");
  const [userIdEscopo, setUserIdEscopo] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [modEditais, setModEditais] = useState(true);
  const [modPropostas, setModPropostas] = useState(true);
  const [modTransparencia, setModTransparencia] = useState(true);
  const [modNoticias, setModNoticias] = useState(false);
  const [modEventos, setModEventos] = useState(false);
  const [modProjetos, setModProjetos] = useState(false);
  const [modDigital, setModDigital] = useState(false);
  const [modDocumentos, setModDocumentos] = useState(false);

  async function carregar(preferUserId?: string) {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/acessos", { credentials: "include" });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Erro ao carregar.");
      setPerfis([]);
      setEscopos([]);
      setProcessos([]);
    } else {
      setPerfis(json.perfis || []);
      setEscopos(json.escopos || []);
      setProcessos(json.processos || []);
      if (json.aviso) {
        setMsg(json.aviso);
      }
      const ativos = (json.perfis || []).filter((p: Perfil) => p.ativo);
      setUserIdEscopo((prev) => {
        if (
          preferUserId &&
          ativos.some((p: Perfil) => p.user_id === preferUserId)
        ) {
          return preferUserId;
        }
        if (prev && ativos.some((p: Perfil) => p.user_id === prev)) {
          return prev;
        }
        return ativos[0]?.user_id || "";
      });
      setProcessoId((prev) => {
        if (prev && (json.processos || []).some((p: Processo) => p.id === prev)) {
          return prev;
        }
        return json.processos?.[0]?.id || "";
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const processosPorTipo = useMemo(() => {
    const groups = new Map<string, Processo[]>();
    for (const p of processos) {
      const key = p.tipo || "_sem_tipo";
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);
    }
    const orderedKeys = [
      ...ORDEM_TIPO_PROCESSO.filter((t) => groups.has(t)),
      ...[...groups.keys()].filter(
        (k) => !(ORDEM_TIPO_PROCESSO as readonly string[]).includes(k)
      ),
    ];
    return orderedKeys.map((key) => ({
      key,
      label: labelTipoProcesso(key === "_sem_tipo" ? null : key),
      items: groups.get(key) || [],
    }));
  }, [processos]);

  const processoNome = useMemo(() => {
    const map = new Map(
      processos.map((p) => [p.id, labelProcessoCompleto(p)])
    );
    return (id: string | null) => (id ? map.get(id) || id : "—");
  }, [processos]);

  const emailDoUsuario = useMemo(() => {
    const map = new Map(perfis.map((p) => [p.user_id, p.email || p.user_id]));
    return (id: string) => map.get(id) || id;
  }, [perfis]);

  async function salvarPerfil() {
    const res = await fetch("/api/admin/acessos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "upsert_perfil", email, papel }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro", "error");
      return;
    }
    triggerToast("Perfil salvo. Selecione o processo e os modulos abaixo.", "success");
    setEmail("");
    if (papel !== "mestre" && json.user_id) {
      setUserIdEscopo(json.user_id);
      await carregar(json.user_id);
    } else {
      await carregar();
    }
  }

  async function criarEscopo() {
    if (!userIdEscopo || !processoId) {
      triggerToast("Selecione usuário (operador/externo) e processo.", "error");
      return;
    }
    const res = await fetch("/api/admin/acessos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "criar_escopo",
        user_id: userIdEscopo,
        processo_id: processoId,
        modulos: {
          editais: modEditais,
          propostas: modPropostas,
          transparencia: modTransparencia,
          noticias: modNoticias,
          eventos: modEventos,
          projetos: modProjetos,
          digital: modDigital,
          documentos: modDocumentos,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro", "error");
      return;
    }
    triggerToast(
      `Escopo vinculado a ${emailDoUsuario(userIdEscopo)}.`,
      "success"
    );
    carregar(userIdEscopo);
  }

  async function removerEscopo(id: string) {
    const res = await fetch("/api/admin/acessos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "remover_escopo", escopo_id: id }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro", "error");
      return;
    }
    triggerToast("Escopo removido.", "success");
    carregar(userIdEscopo);
  }

  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function carregarConvites() {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/convites", { headers });
    if (!res.ok) return;
    const json = (await res.json()) as { ok: boolean; data?: Convite[] };
    if (json.ok) setConvites(json.data ?? []);
  }

  useEffect(() => { void carregarConvites(); }, []);

  async function enviarConvite() {
    if (!conviteEmail.trim()) { triggerToast("Informe o e-mail.", "error"); return; }
    setEnviandoConvite(true);
    const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" };
    const res = await fetch("/api/admin/convites", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: conviteEmail.trim(), papel: convitePapel }),
    });
    const json = (await res.json()) as { ok: boolean; link?: string; email_enviado?: boolean; error?: string };
    setEnviandoConvite(false);
    if (!json.ok) {
      const msgs: Record<string, string> = {
        convite_ja_pendente: "Já existe um convite pendente para este e-mail.",
        email_invalido: "E-mail inválido.",
      };
      triggerToast(msgs[json.error ?? ""] ?? `Erro: ${json.error}`, "error");
      return;
    }
    setConviteEmail("");
    if (json.link) {
      await navigator.clipboard.writeText(json.link).catch(() => null);
      setLinkCopiado(json.link);
      setTimeout(() => setLinkCopiado(null), 4000);
    }
    triggerToast(
      json.email_enviado ? "Convite enviado por e-mail!" : "Convite criado. Link copiado (e-mail não configurado).",
      "success"
    );
    void carregarConvites();
  }

  async function revogarConvite(id: string) {
    const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" };
    const res = await fetch("/api/admin/convites", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { triggerToast("Erro ao revogar.", "error"); return; }
    triggerToast("Convite revogado.", "success");
    void carregarConvites();
  }

  return (
    <div className="admin-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="admin-h1">Acessos</h1>
          <p style={{ marginTop: 8, maxWidth: 760 }}>
            Vincule logins (ja criados no Supabase Auth) a papeis e processos.
            Mestre ve tudo; operador/externo so o escopo liberado.
          </p>
        </div>
        <Link className="admin-button" href="/admin/processos">
          Ver processos
        </Link>
      </div>

      {!loading && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {[
            { label: "Total perfis", value: perfis.length, color: "#93c5fd" },
            { label: "Ativos", value: perfis.filter((p) => p.ativo).length, color: "#86efac" },
            { label: "Convites pendentes", value: convites.filter((c) => !c.aceito_em).length, color: "#fde047" },
            { label: "Escopos vinculados", value: escopos.length, color: "#c4b5fd" },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${card.color}44`,
                borderRadius: 12,
                padding: "12px 18px",
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className="admin-card" style={{ marginTop: 16, border: "1px solid #f59e0b" }}>
          <strong>Aviso:</strong> {msg}
        </div>
      )}

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">1) Adicionar / atualizar perfil</h2>
        <label>E-mail do usuário (autenticação)</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parceiro@exemplo.org"
        />
        <label>Papel</label>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as AdminPapel)}
        >
          <option value="mestre">Mestre</option>
          <option value="operador">Operador</option>
          <option value="externo">Externo</option>
        </select>
        <button type="button" className="admin-button" onClick={salvarPerfil}>
          Salvar perfil
        </button>
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">2) Vincular escopo (processo + modulos)</h2>
        <label>Usuario</label>
        <select
          value={userIdEscopo}
          onChange={(e) => setUserIdEscopo(e.target.value)}
        >
          {perfis.filter((p) => p.ativo).length === 0 ? (
            <option value="">Nenhum perfil ativo</option>
          ) : null}
          {perfis
            .filter((p) => p.ativo)
            .map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.email || p.user_id} ({p.papel})
              </option>
            ))}
        </select>
        <label>Processo (agrupado por tipo)</label>
        <select
          value={processoId}
          onChange={(e) => setProcessoId(e.target.value)}
        >
          {processosPorTipo.map((grupo) => (
            <optgroup key={grupo.key} label={grupo.label}>
              {grupo.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo} ({p.status})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modEditais}
              onChange={(e) => setModEditais(e.target.checked)}
            />
            Editais
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modPropostas}
              onChange={(e) => setModPropostas(e.target.checked)}
            />
            Propostas
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modTransparencia}
              onChange={(e) => setModTransparencia(e.target.checked)}
            />
            Transparencia
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modNoticias}
              onChange={(e) => setModNoticias(e.target.checked)}
            />
            Noticias
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modEventos}
              onChange={(e) => setModEventos(e.target.checked)}
            />
            Eventos
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modProjetos}
              onChange={(e) => setModProjetos(e.target.checked)}
            />
            Projetos
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modDigital}
              onChange={(e) => setModDigital(e.target.checked)}
            />
            Digital
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={modDocumentos}
              onChange={(e) => setModDocumentos(e.target.checked)}
            />
            Documentos
          </label>
        </div>
        <p style={{ fontSize: 13, opacity: 0.85 }}>
          Marque somente os módulos deste processo. Digital libera a fila de
          redes. Documentos libera a Gestão Documental. CMS do site IPECC
          permanece com o mestre.
        </p>
        <button type="button" className="admin-button" onClick={criarEscopo}>
          Vincular escopo
        </button>
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Perfis</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : perfis.length === 0 ? (
          <p>Nenhum perfil. Aplique o SQL e salve o primeiro mestre/operador.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {perfis.map((p) => (
              <div
                key={p.user_id}
                style={{
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <strong>{p.email || p.user_id}</strong>
                <p style={{ margin: "6px 0 0" }}>
                  Papel: {p.papel} · {p.ativo ? "ativo" : "inativo"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Convites de colaboração</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>
          Convide pessoas por e-mail. Elas receberão um link para aceitar e entrarão como membros da organização.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            value={conviteEmail}
            onChange={(e) => setConviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            style={{ flex: "1 1 220px" }}
            onKeyDown={(e) => { if (e.key === "Enter") void enviarConvite(); }}
          />
          <select
            value={convitePapel}
            onChange={(e) => setConvitePapel(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="operador">Operador</option>
            <option value="coordenador">Coordenador</option>
            <option value="externo">Externo</option>
          </select>
          <button
            type="button"
            className="admin-button"
            onClick={() => void enviarConvite()}
            disabled={enviandoConvite}
          >
            {enviandoConvite ? "Enviando..." : "Convidar"}
          </button>
        </div>

        {linkCopiado && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(22,101,52,0.2)", border: "1px solid #166534", fontSize: 12, color: "#86efac", marginBottom: 12, wordBreak: "break-all" as const }}>
            Link copiado: {linkCopiado}
          </div>
        )}

        {convites.length === 0 ? (
          <p style={{ fontSize: 13, color: "#475569" }}>Nenhum convite enviado ainda.</p>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(148,163,184,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["E-mail", "Papel", "Status", "Expira em", ""].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(148,163,184,0.12)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convites.map((c, i) => {
                  const expirado = new Date(c.expires_at) < new Date();
                  const status = c.aceito_em ? "aceito" : expirado ? "expirado" : "pendente";
                  const statusCor: CSSProperties = status === "aceito"
                    ? { color: "#86efac" }
                    : status === "expirado"
                    ? { color: "#f87171" }
                    : { color: "#fde047" };
                  return (
                    <tr key={c.id} style={{ background: i % 2 ? "rgba(148,163,184,0.04)" : "transparent" }}>
                      <td style={{ padding: "9px 12px", color: "#cbd5e1", borderTop: "1px solid rgba(148,163,184,0.08)" }}>{c.email}</td>
                      <td style={{ padding: "9px 12px", color: "#94a3b8", borderTop: "1px solid rgba(148,163,184,0.08)" }}>{c.papel}</td>
                      <td style={{ padding: "9px 12px", borderTop: "1px solid rgba(148,163,184,0.08)", fontWeight: 700, ...statusCor }}>{status}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b", borderTop: "1px solid rgba(148,163,184,0.08)" }}>{new Date(c.expires_at).toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding: "9px 12px", borderTop: "1px solid rgba(148,163,184,0.08)" }}>
                        {!c.aceito_em && (
                          <button
                            type="button"
                            className="admin-button"
                            style={{ background: "#7f1d1d", padding: "3px 10px", fontSize: 11 }}
                            onClick={() => void revogarConvite(c.id)}
                          >
                            Revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Escopos</h2>
        {escopos.length === 0 ? (
          <p>Nenhum escopo vinculado.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {escopos.map((e) => {
              const chips = chipsModulosEscopo(e);
              return (
                <div
                  key={e.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{processoNome(e.processo_id)}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                      usuario: {emailDoUsuario(e.user_id)}
                    </p>
                    <div style={{ marginTop: 6 }}>
                      {chips.length === 0 ? (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          Nenhum modulo marcado
                        </span>
                      ) : (
                        chips.map((c) => (
                          <span key={c} style={chipStyle}>
                            {c}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-button"
                    style={{ background: "#ef4444" }}
                    onClick={() => removerEscopo(e.id)}
                  >
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
