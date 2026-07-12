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
  AJUDA_PUBLICACAO_ASSISTIDA,
  LABEL_ESCOPO,
  LABEL_PLATAFORMA,
  LABEL_STATUS,
  formatarDataAgendada,
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

function textoPublicavel(post: DigitalPost): string {
  return [post.body?.trim(), post.hashtags?.trim()]
    .filter(Boolean)
    .join("\n\n");
}

function primeiroLink(post: DigitalPost): string | null {
  if (post.media_url?.trim()) return post.media_url.trim();
  const m = post.body?.match(/https?:\/\/[^\s)]+/i);
  return m?.[0] ?? null;
}

type FilaResumo = {
  draft: number;
  approved: number;
  scheduled: number;
  scheduled_vencidos: number;
  published_manual: number;
  archived: number;
};

const RESUMO_VAZIO: FilaResumo = {
  draft: 0,
  approved: 0,
  scheduled: 0,
  scheduled_vencidos: 0,
  published_manual: 0,
  archived: 0,
};

function postAgendamentoVencido(post: DigitalPost): boolean {
  if (post.status !== "scheduled" || !post.scheduled_at) return false;
  const t = new Date(post.scheduled_at).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DigitalAdminPage() {
  const [tab, setTab] = useState<Tab>("fila");
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [accounts, setAccounts] = useState<DigitalAccount[]>([]);
  const [posts, setPosts] = useState<DigitalPost[]>([]);
  const [resumo, setResumo] = useState<FilaResumo>(RESUMO_VAZIO);
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
  const [manualMedia, setManualMedia] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editMedia, setEditMedia] = useState("");
  const [editAccountIds, setEditAccountIds] = useState<string[]>([]);
  const [scheduleForId, setScheduleForId] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");

  const contasDestino = accounts.filter((a) => a.ativo);

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
      setResumo(RESUMO_VAZIO);
    } else {
      setPosts(postJson.posts ?? []);
      setResumo(postJson.resumo ?? RESUMO_VAZIO);
      if (postJson.aviso) setAviso((prev) => prev ?? postJson.aviso);
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const siteAtivos = accounts
      .filter((a) => a.scope === "site" && a.ativo)
      .map((a) => a.id);
    setSelectedAccountIds((prev) => {
      if (prev.length === 0) return siteAtivos;
      const stillValid = prev.filter((id) =>
        accounts.some((a) => a.id === id && a.ativo)
      );
      return stillValid.length > 0 ? stillValid : siteAtivos;
    });
  }, [accounts]);

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
    if (selectedAccountIds.length === 0) {
      setAviso("Selecione ao menos um perfil de destino.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: manualTitle,
        body: manualBody,
        hashtags: manualTags,
        media_url: manualMedia.trim() || null,
        account_ids: selectedAccountIds,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Falha ao criar post");
    } else {
      setManualTitle("");
      setManualBody("");
      setManualMedia("");
      await carregar();
    }
    setBusy(false);
  }

  async function setPostStatus(
    post: DigitalPost,
    status: DigitalPostStatus,
    extra?: { scheduled_at?: string | null }
  ) {
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        status,
        ...(extra?.scheduled_at !== undefined
          ? { scheduled_at: extra.scheduled_at }
          : status === "approved"
            ? { scheduled_at: null }
            : {}),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) setAviso(json.error ?? "Falha ao atualizar post");
    else {
      if (status === "published_manual") {
        setAviso("Marcado como publicado manualmente nas redes.");
      } else if (status === "scheduled") {
        setAviso("Post agendado na fila (lembrete editorial — sem envio automático).");
        setScheduleForId(null);
      }
      if (editingId === post.id) setEditingId(null);
      await carregar();
    }
    setBusy(false);
  }

  function abrirAgendar(post: DigitalPost) {
    setScheduleForId(post.id);
    setScheduleValue(
      toDatetimeLocalValue(post.scheduled_at) ||
        toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000).toISOString())
    );
    setAviso(null);
  }

  async function confirmarAgendamento(post: DigitalPost) {
    if (!scheduleValue) {
      setAviso("Informe data e hora do agendamento.");
      return;
    }
    const iso = new Date(scheduleValue).toISOString();
    if (Number.isNaN(new Date(scheduleValue).getTime())) {
      setAviso("Data/hora inválida.");
      return;
    }
    await setPostStatus(post, "scheduled", { scheduled_at: iso });
  }

  function iniciarEdicao(post: DigitalPost) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditTags(post.hashtags ?? "");
    setEditMedia(post.media_url ?? "");
    setEditAccountIds((post.targets ?? []).map((t) => t.account_id));
    setAviso(null);
  }

  async function salvarEdicao(postId: string) {
    if (editAccountIds.length === 0) {
      setAviso("Selecione ao menos um perfil de destino.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: postId,
        title: editTitle,
        body: editBody,
        hashtags: editTags,
        media_url: editMedia.trim() || null,
        account_ids: editAccountIds,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Falha ao salvar edição");
    } else {
      setEditingId(null);
      setAviso("Texto e destinos atualizados.");
      await carregar();
    }
    setBusy(false);
  }

  function toggleId(list: string[], id: string, on: boolean): string[] {
    if (on) return list.includes(id) ? list : [...list, id];
    return list.filter((x) => x !== id);
  }

  async function copiarTexto(post: DigitalPost) {
    const texto = textoPublicavel(post);
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado. Cole na rede e, em seguida, marque como publicado.");
    } catch {
      setAviso("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  async function copiarLink(post: DigitalPost) {
    const link = primeiroLink(post);
    if (!link) {
      setAviso("Este post não tem link para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não foi possível copiar o link.");
    }
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Digital — redes sociais</h1>
      <p style={{ ...metaStyle, marginTop: adminTokens.spacing.sm }}>
        Gerencie perfis do site e por projeto, e a fila editorial. O agente gera
        rascunhos a partir de notícias, eventos e programas. {AJUDA_PUBLICACAO_ASSISTIDA}
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
              <input
                style={inputStyle}
                placeholder="URL de mídia ou link (opcional)"
                value={manualMedia}
                onChange={(e) => setManualMedia(e.target.value)}
              />
              <div>
                <div style={{ ...metaStyle, marginBottom: 6 }}>Destinos</div>
                {contasDestino.length === 0 ? (
                  <p style={metaStyle}>Nenhum perfil ativo. Cadastre em Perfis.</p>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {contasDestino.map((a) => (
                      <label
                        key={a.id}
                        style={{
                          ...metaStyle,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          color: "#e5e7eb",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.includes(a.id)}
                          onChange={(e) =>
                            setSelectedAccountIds((prev) =>
                              toggleId(prev, a.id, e.target.checked)
                            )
                          }
                        />
                        {rotuloPlataforma(a.platform)} · {a.label}
                        {a.scope === "projeto" && a.projeto_ref
                          ? ` (${a.projeto_ref})`
                          : ""}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={btnStyle}
                disabled={
                  busy ||
                  !manualTitle ||
                  !manualBody ||
                  selectedAccountIds.length === 0
                }
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
            {(
              [
                ["", "Todos"],
                ["draft", `Rascunhos (${resumo.draft})`],
                ["approved", `Aprovados (${resumo.approved})`],
                ["scheduled", `Agendados (${resumo.scheduled})`],
                ["published_manual", `Publicados (${resumo.published_manual})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                style={statusFilter === value ? btnStyle : btnGhost}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {resumo.scheduled_vencidos > 0 && (
            <p
              style={{
                ...metaStyle,
                marginTop: adminTokens.spacing.sm,
                color: "#f59e0b",
              }}
            >
              {resumo.scheduled_vencidos} agendamento(s) vencido(s) — copie o
              texto e marque como publicado, ou reagende.
            </p>
          )}

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Fila editorial</h2>
            <p style={{ ...metaStyle, marginTop: 0 }}>
              Resumo: {resumo.draft} rascunho(s) · {resumo.approved} aprovado(s)
              · {resumo.scheduled} agendado(s)
              {resumo.scheduled_vencidos > 0
                ? ` (${resumo.scheduled_vencidos} vencido(s))`
                : ""}{" "}
              · {resumo.published_manual} publicado(s)
            </p>
            {posts.length === 0 ? (
              <p style={metaStyle}>
                Nenhum post. Use “Gerar rascunhos” ou crie um manual.
              </p>
            ) : (
              posts.map((p) => {
                const editavel =
                  p.status === "draft" ||
                  p.status === "approved" ||
                  p.status === "scheduled";
                const editando = editingId === p.id;
                const link = primeiroLink(p);
                const targets = p.targets ?? [];
                const podeCopiar =
                  p.status === "approved" ||
                  p.status === "draft" ||
                  p.status === "scheduled";
                const agendando = scheduleForId === p.id;
                const vencido = postAgendamentoVencido(p);

                return (
                  <div
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #334155",
                      padding: `${adminTokens.spacing.sm}px 0`,
                      borderLeft: vencido ? "3px solid #f59e0b" : undefined,
                      paddingLeft: vencido ? adminTokens.spacing.sm : undefined,
                    }}
                  >
                    {editando ? (
                      <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
                        <input
                          style={inputStyle}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          aria-label="Título do post"
                        />
                        <textarea
                          style={{ ...inputStyle, minHeight: 120 }}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          aria-label="Texto do post"
                        />
                        <input
                          style={inputStyle}
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="Marcadores (#)"
                          aria-label="Marcadores"
                        />
                        <input
                          style={inputStyle}
                          value={editMedia}
                          onChange={(e) => setEditMedia(e.target.value)}
                          placeholder="URL de mídia ou link (opcional)"
                          aria-label="URL de mídia"
                        />
                        <div>
                          <div style={{ ...metaStyle, marginBottom: 6 }}>
                            Destinos
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {contasDestino.map((a) => (
                              <label
                                key={a.id}
                                style={{
                                  ...metaStyle,
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                  color: "#e5e7eb",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={editAccountIds.includes(a.id)}
                                  onChange={(e) =>
                                    setEditAccountIds((prev) =>
                                      toggleId(prev, a.id, e.target.checked)
                                    )
                                  }
                                />
                                {rotuloPlataforma(a.platform)} · {a.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong>{p.title}</strong>
                        <div style={metaStyle}>
                          {rotuloStatus(p.status)} · {rotuloOrigem(p.source_type)}
                          {p.source_id ? ` · ${p.source_id}` : ""}
                          {p.scheduled_at
                            ? ` · agendado para ${formatarDataAgendada(p.scheduled_at)}`
                            : ""}
                          {vencido ? " · vencido" : ""}
                        </div>
                        {targets.length > 0 && (
                          <div
                            style={{
                              ...metaStyle,
                              marginTop: 4,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <span>Destinos:</span>
                            {targets.map((t) => (
                              <a
                                key={t.account_id}
                                href={t.href}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#93c5fd" }}
                              >
                                Abrir {rotuloPlataforma(t.platform)}
                              </a>
                            ))}
                          </div>
                        )}
                        <pre
                          style={{
                            ...metaStyle,
                            margin: `${adminTokens.spacing.sm}px 0`,
                          }}
                        >
                          {p.body}
                          {p.hashtags ? `\n\n${p.hashtags}` : ""}
                        </pre>
                      </>
                    )}
                    {agendando && !editando && (
                      <div
                        style={{
                          ...rowStyle,
                          marginBottom: adminTokens.spacing.sm,
                        }}
                      >
                        <input
                          type="datetime-local"
                          style={inputStyle}
                          value={scheduleValue}
                          onChange={(e) => setScheduleValue(e.target.value)}
                          aria-label="Data e hora do agendamento"
                        />
                        <button
                          type="button"
                          style={btnStyle}
                          disabled={busy || !scheduleValue}
                          onClick={() => void confirmarAgendamento(p)}
                        >
                          Confirmar agendamento
                        </button>
                        <button
                          type="button"
                          style={btnGhost}
                          disabled={busy}
                          onClick={() => setScheduleForId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    <div style={rowStyle}>
                      {editando ? (
                        <>
                          <button
                            type="button"
                            style={btnStyle}
                            disabled={
                              busy ||
                              !editTitle.trim() ||
                              !editBody.trim() ||
                              editAccountIds.length === 0
                            }
                            onClick={() => void salvarEdicao(p.id)}
                          >
                            Salvar texto
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {editavel && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() => iniciarEdicao(p)}
                            >
                              Editar texto
                            </button>
                          )}
                          {podeCopiar && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() => void copiarTexto(p)}
                            >
                              Copiar texto
                            </button>
                          )}
                          {link && podeCopiar && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() => void copiarLink(p)}
                            >
                              Copiar link
                            </button>
                          )}
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
                          {(p.status === "draft" ||
                            p.status === "approved" ||
                            p.status === "scheduled") &&
                            !agendando && (
                              <button
                                type="button"
                                style={btnGhost}
                                disabled={busy}
                                onClick={() => abrirAgendar(p)}
                              >
                                Agendar
                              </button>
                            )}
                          {p.status === "scheduled" && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() => void setPostStatus(p, "approved")}
                            >
                              Tirar agendamento
                            </button>
                          )}
                          {(p.status === "draft" ||
                            p.status === "approved" ||
                            p.status === "scheduled") && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() =>
                                void setPostStatus(p, "published_manual")
                              }
                            >
                              Marcar publicado nas redes
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
