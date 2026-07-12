"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { adminTokens } from "@/components/admin";
import type {
  DigitalAccount,
  DigitalPlatform,
  DigitalPost,
  DigitalPostStatus,
} from "@/lib/digital/types";
import { DIGITAL_PLATFORMS } from "@/lib/digital/types";
import {
  LABEL_ESCOPO,
  LABEL_PLATAFORMA,
  LABEL_STATUS,
  rotuloOrigem,
  rotuloPlataforma,
  rotuloStatus,
} from "@/lib/digital/labels";

type Tab = "perfis" | "fila";

const pageStyle: CSSProperties = {
  maxWidth: 960,
  color: "#e5e7eb",
};

const cardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid #334155",
  borderRadius: adminTokens.borderRadius.md,
  padding: adminTokens.spacing.base + adminTokens.spacing.sm,
  marginTop: adminTokens.spacing.base,
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: adminTokens.spacing.sm,
  alignItems: "center",
};

const inputStyle: CSSProperties = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  borderRadius: adminTokens.borderRadius.sm,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e5e7eb",
  minWidth: 160,
  flex: 1,
};

const btnStyle: CSSProperties = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
  borderRadius: adminTokens.borderRadius.full,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  background: "#1e40af",
  color: "#fff",
};

const btnGhost: CSSProperties = {
  ...btnStyle,
  background: "transparent",
  color: "#e5e7eb",
  border: "1px solid #334155",
};

const metaStyle: CSSProperties = {
  fontSize: adminTokens.typography.fontSize.xs,
  color: "#94a3b8",
  whiteSpace: "pre-wrap",
};

export default function DigitalAdminPage() {
  const [tab, setTab] = useState<Tab>("fila");
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [accounts, setAccounts] = useState<DigitalAccount[]>([]);
  const [posts, setPosts] = useState<DigitalPost[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [newPlatform, setNewPlatform] = useState<DigitalPlatform>("instagram");
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newScope, setNewScope] = useState<"site" | "projeto">("site");
  const [newProjetoRef, setNewProjetoRef] = useState("");

  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [manualTags, setManualTags] = useState("#IPECC");

  const carregar = useCallback(async () => {
    setLoading(true);
    setAviso(null);

    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const [accRes, postRes] = await Promise.all([
      fetch("/api/admin/digital/accounts"),
      fetch(`/api/admin/digital/posts${qs}`),
    ]);
    const accJson = await accRes.json();
    const postJson = await postRes.json();

    if (!accRes.ok || !accJson.ok) {
      setAviso(accJson.error ?? "Erro ao carregar perfis");
      setAccounts([]);
    } else {
      setAccounts(accJson.accounts ?? []);
      if (accJson.aviso) setAviso(accJson.aviso);
    }

    if (!postRes.ok || !postJson.ok) {
      setAviso((prev) => prev ?? postJson.error ?? "Erro ao carregar fila");
      setPosts([]);
    } else {
      setPosts(postJson.posts ?? []);
      if (postJson.aviso) setAviso((prev) => prev ?? postJson.aviso);
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerarRascunhos() {
    setBusy(true);
    setAviso(null);
    const res = await fetch("/api/admin/digital/generate", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Falha ao gerar rascunhos");
    } else {
      setAviso(
        `Agente: ${json.generated} gerado(s), ${json.skipped} ignorado(s).` +
          (json.errors?.length ? ` Avisos: ${json.errors.length}` : "")
      );
      setTab("fila");
      await carregar();
    }
    setBusy(false);
  }

  async function criarPerfil() {
    setBusy(true);
    const res = await fetch("/api/admin/digital/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: newPlatform,
        label: newLabel || newPlatform,
        href: newHref,
        handle: newHandle || null,
        scope: newScope,
        projeto_ref: newScope === "projeto" ? newProjetoRef : null,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Falha ao criar perfil");
    } else {
      setNewLabel("");
      setNewHref("");
      setNewHandle("");
      setNewProjetoRef("");
      await carregar();
    }
    setBusy(false);
  }

  async function toggleAtivo(account: DigitalAccount) {
    setBusy(true);
    const res = await fetch("/api/admin/digital/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, ativo: !account.ativo }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) setAviso(json.error ?? "Falha ao atualizar");
    else await carregar();
    setBusy(false);
  }

  async function criarPostManual() {
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: manualTitle,
        body: manualBody,
        hashtags: manualTags,
        account_ids: accounts.filter((a) => a.scope === "site" && a.ativo).map((a) => a.id),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Falha ao criar post");
    } else {
      setManualTitle("");
      setManualBody("");
      await carregar();
    }
    setBusy(false);
  }

  async function setPostStatus(post: DigitalPost, status: DigitalPostStatus) {
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, status }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) setAviso(json.error ?? "Falha ao atualizar post");
    else await carregar();
    setBusy(false);
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Digital — redes sociais</h1>
      <p style={{ ...metaStyle, marginTop: adminTokens.spacing.sm }}>
        Gerencie perfis do site e por projeto, e a fila editorial. O agente gera
        rascunhos a partir de notícias, eventos e programas. Publicação automática
        nas interfaces das redes fica para a Fase 2.
      </p>

      <div style={{ ...rowStyle, marginTop: adminTokens.spacing.base }}>
        <button
          type="button"
          style={tab === "fila" ? btnStyle : btnGhost}
          onClick={() => setTab("fila")}
        >
          Fila
        </button>
        <button
          type="button"
          style={tab === "perfis" ? btnStyle : btnGhost}
          onClick={() => setTab("perfis")}
        >
          Perfis
        </button>
        <button
          type="button"
          style={btnStyle}
          disabled={busy}
          onClick={() => void gerarRascunhos()}
        >
          {busy ? "Aguarde…" : "Gerar rascunhos (agente)"}
        </button>
      </div>

      {aviso && (
        <p style={{ ...metaStyle, marginTop: adminTokens.spacing.base, color: "#b45309" }}>
          {aviso}
        </p>
      )}

      {loading ? (
        <p style={{ marginTop: adminTokens.spacing.base }}>Carregando…</p>
      ) : tab === "perfis" ? (
        <>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Novo perfil</h2>
            <div style={rowStyle}>
              <select
                style={inputStyle}
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as DigitalPlatform)}
              >
                {DIGITAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {LABEL_PLATAFORMA[p]}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                value={newScope}
                onChange={(e) =>
                  setNewScope(e.target.value === "projeto" ? "projeto" : "site")
                }
              >
                <option value="site">{LABEL_ESCOPO.site}</option>
                <option value="projeto">{LABEL_ESCOPO.projeto}</option>
              </select>
              <input
                style={inputStyle}
                placeholder="Rótulo"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Endereço (URL)"
                value={newHref}
                onChange={(e) => setNewHref(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Identificador na rede (opcional)"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
              {newScope === "projeto" && (
                <input
                  style={inputStyle}
                  placeholder="Referência do projeto (ex.: valer-mais)"
                  value={newProjetoRef}
                  onChange={(e) => setNewProjetoRef(e.target.value)}
                />
              )}
              <button
                type="button"
                style={btnStyle}
                disabled={busy || !newHref}
                onClick={() => void criarPerfil()}
              >
                Salvar perfil
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Perfis cadastrados</h2>
            {accounts.length === 0 ? (
              <p style={metaStyle}>Nenhum perfil. Aplique o SQL e/ou cadastre acima.</p>
            ) : (
              accounts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    ...rowStyle,
                    justifyContent: "space-between",
                    borderBottom: "1px solid #334155",
                    padding: `${adminTokens.spacing.sm}px 0`,
                  }}
                >
                  <div>
                    <strong>
                      {a.label} · {rotuloPlataforma(a.platform)}
                    </strong>
                    <div style={metaStyle}>
                      {a.scope === "projeto"
                        ? LABEL_ESCOPO.projeto
                        : LABEL_ESCOPO.site}
                      {a.projeto_ref ? ` / ${a.projeto_ref}` : ""} ·{" "}
                      {a.ativo ? "ativo" : "inativo"}
                      <br />
                      <a href={a.href} target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>
                        {a.href}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={btnGhost}
                    disabled={busy}
                    onClick={() => void toggleAtivo(a)}
                  >
                    {a.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Novo post manual</h2>
            <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
              <input
                style={inputStyle}
                placeholder="Título"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 100 }}
                placeholder="Texto do post"
                value={manualBody}
                onChange={(e) => setManualBody(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Marcadores (#)"
                value={manualTags}
                onChange={(e) => setManualTags(e.target.value)}
              />
              <button
                type="button"
                style={btnStyle}
                disabled={busy || !manualTitle || !manualBody}
                onClick={() => void criarPostManual()}
              >
                Salvar rascunho
              </button>
            </div>
          </div>

          <div style={{ ...rowStyle, marginTop: adminTokens.spacing.base }}>
            <label style={metaStyle}>Filtrar status:</label>
            <select
              style={inputStyle}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {(Object.keys(LABEL_STATUS) as DigitalPostStatus[]).map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Fila editorial</h2>
            {posts.length === 0 ? (
              <p style={metaStyle}>
                Nenhum post. Use “Gerar rascunhos” ou crie um manual.
              </p>
            ) : (
              posts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    borderBottom: "1px solid #334155",
                    padding: `${adminTokens.spacing.sm}px 0`,
                  }}
                >
                  <strong>{p.title}</strong>
                  <div style={metaStyle}>
                    {rotuloStatus(p.status)} · {rotuloOrigem(p.source_type)}
                    {p.source_id ? ` · ${p.source_id}` : ""}
                  </div>
                  <pre style={{ ...metaStyle, margin: `${adminTokens.spacing.sm}px 0` }}>
                    {p.body}
                    {p.hashtags ? `\n\n${p.hashtags}` : ""}
                  </pre>
                  <div style={rowStyle}>
                    {p.status === "draft" && (
                      <button
                        type="button"
                        style={btnStyle}
                        disabled={busy}
                        onClick={() => void setPostStatus(p, "approved")}
                      >
                        Aprovar
                      </button>
                    )}
                    {(p.status === "draft" || p.status === "approved") && (
                      <button
                        type="button"
                        style={btnGhost}
                        disabled={busy}
                        onClick={() => void setPostStatus(p, "published_manual")}
                      >
                        Marcar publicado (manual)
                      </button>
                    )}
                    {p.status !== "archived" && (
                      <button
                        type="button"
                        style={btnGhost}
                        disabled={busy}
                        onClick={() => void setPostStatus(p, "archived")}
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
