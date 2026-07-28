"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  COMANDO_INSTALAR_AGENTE,
  LABEL_ESCOPO,
  LABEL_PLATAFORMA,
  LABEL_STATUS,
  formatarDataAgendada,
  rotuloAutomacao,
  rotuloOrigem,
  rotuloPlataforma,
  rotuloStatus,
} from "@/lib/digital/labels";

type Tab = "perfis" | "fila";

type LogEntry = {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  details: Record<string, unknown> | null;
  platform: string | null;
  created_at: string;
};

type AgentPrimary = {
  label: string;
  online: boolean;
  machine_name: string | null;
  meta_session_status: string;
  last_heartbeat_at: string | null;
  dry_run: boolean;
};
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccLabel, setEditAccLabel] = useState("");
  const [editAccHref, setEditAccHref] = useState("");
  const [editAccHandle, setEditAccHandle] = useState("");
  const [editAccProjetoRef, setEditAccProjetoRef] = useState("");

  const [agentPrimary, setAgentPrimary] = useState<AgentPrimary | null>(null);
  const [agentAviso, setAgentAviso] = useState<string | null>(null);
  const [queueWaiting, setQueueWaiting] = useState(0);

  const [avisoTipo, setAvisoTipo] = useState<"ok" | "erro" | "info">("info");
  const [uploading, setUploading] = useState(false);
  const manualFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Seleção em lote
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  // Histórico de logs por post
  const [logsOpen, setLogsOpen] = useState<string | null>(null);
  const [logsData, setLogsData] = useState<Record<string, LogEntry[]>>({});
  const [logsLoading, setLogsLoading] = useState(false);

  const contasDestino = accounts.filter((a) => a.ativo);

  const carregarAgente = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/digital/agent", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAgentAviso(json.error ?? "Falha ao consultar agente");
        return;
      }
      setAgentAviso(json.aviso ?? null);
      setAgentPrimary(json.primary ?? null);
      setQueueWaiting(typeof json.queue_waiting === "number" ? json.queue_waiting : 0);
    } catch {
      setAgentAviso("Falha de rede ao consultar agente");
    }
  }, []);

  function flash(texto: string, tipo: "ok" | "erro" | "info" = "info") {
    setAviso(texto);
    setAvisoTipo(tipo);
  }

  async function uploadMidia(file: File, setUrl: (u: string) => void) {
    setUploading(true);
    setAviso(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/digital/media/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        flash(json.error ?? "Falha no upload", "erro");
      } else {
        setUrl(json.media.public_url ?? "");
        flash(`Arquivo enviado: ${json.media.file_name}`, "ok");
      }
    } catch {
      flash("Falha de rede no upload", "erro");
    }
    setUploading(false);
  }

  async function copiarComandoInstalar() {
    try {
      await navigator.clipboard.writeText(COMANDO_INSTALAR_AGENTE);
      flash(
        "Comando de instalação copiado. Cole no PowerShell na pasta do projeto (uma única vez).",
        "ok"
      );
    } catch {
      flash(`Copie manualmente: ${COMANDO_INSTALAR_AGENTE}`, "info");
    }
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    setAviso(null);

    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("page", String(page));
    const [accRes, postRes] = await Promise.all([
      fetch("/api/admin/digital/accounts"),
      fetch(`/api/admin/digital/posts?${qs}`),
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
      setAvisoTipo("erro");
      setPosts([]);
      setResumo(RESUMO_VAZIO);
      setTotalPosts(0);
      setHasMore(false);
    } else {
      setPosts(postJson.posts ?? []);
      setResumo(postJson.resumo ?? RESUMO_VAZIO);
      setTotalPosts(postJson.total ?? 0);
      setHasMore(postJson.hasMore ?? false);
      if (postJson.aviso) setAviso((prev) => prev ?? postJson.aviso);
    }

    setLoading(false);
    void carregarAgente();
  }, [statusFilter, page, carregarAgente]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const t = setInterval(() => void carregarAgente(), 30000);
    return () => clearInterval(t);
  }, [carregarAgente]);

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
      flash(json.error ?? "Falha ao gerar rascunhos", "erro");
    } else {
      flash(
        `Agente: ${json.generated} gerado(s), ${json.skipped} ignorado(s).` +
          (json.errors?.length ? ` Avisos: ${json.errors.length}` : ""),
        "ok"
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
      flash(json.error ?? "Falha ao criar perfil", "erro");
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
    if (!res.ok || !json.ok) flash(json.error ?? "Falha ao atualizar", "erro");
    else await carregar();
    setBusy(false);
  }

  /** Conectar / ativar / verificar sessão (sem senha; sessão no worker). */
  async function atualizarAutomacaoConta(
    account: DigitalAccount,
    opts: {
      action:
        | "enable"
        | "disable"
        | "request_connect"
        | "mark_disconnected"
        | "verify_session";
      automation_strategy?: string;
    }
  ) {
    setBusy(true);
    setAviso(null);
    const res = await fetch("/api/admin/digital/accounts/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: account.id,
        action: opts.action,
        automation_strategy: opts.automation_strategy,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha ao atualizar automação", "erro");
    } else {
      flash(json.aviso ?? "Automação da conta atualizada.", "ok");
      await carregar();
    }
    setBusy(false);
  }

  function iniciarEdicaoPerfil(account: DigitalAccount) {
    setEditingAccountId(account.id);
    setEditAccLabel(account.label);
    setEditAccHref(account.href);
    setEditAccHandle(account.handle ?? "");
    setEditAccProjetoRef(account.projeto_ref ?? "");
    setAviso(null);
  }

  async function salvarEdicaoPerfil(account: DigitalAccount) {
    if (!editAccLabel.trim() || !editAccHref.trim()) {
      flash("Rótulo e endereço (URL) são obrigatórios.", "erro");
      return;
    }
    if (account.scope === "projeto" && !editAccProjetoRef.trim()) {
      flash("Referência do projeto é obrigatória neste perfil.", "erro");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/digital/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: account.id,
        label: editAccLabel,
        href: editAccHref,
        handle: editAccHandle,
        projeto_ref:
          account.scope === "projeto" ? editAccProjetoRef.trim() : null,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha ao salvar perfil", "erro");
    } else {
      setEditingAccountId(null);
      flash("Perfil atualizado.", "ok");
      await carregar();
    }
    setBusy(false);
  }

  async function criarPostManual() {
    if (selectedAccountIds.length === 0) {
      flash("Selecione ao menos um perfil de destino.", "erro");
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
      flash(json.error ?? "Falha ao criar post", "erro");
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
    if (!res.ok || !json.ok) flash(json.error ?? "Falha ao atualizar post", "erro");
    else {
      if (status === "published_manual") {
        flash("Marcado como publicado manualmente nas redes.", "ok");
      } else if (status === "scheduled") {
        flash("Post agendado na fila (lembrete editorial — sem envio automático).", "ok");
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
      flash("Informe data e hora do agendamento.", "erro");
      return;
    }
    const iso = new Date(scheduleValue).toISOString();
    if (Number.isNaN(new Date(scheduleValue).getTime())) {
      flash("Data/hora inválida.", "erro");
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
      flash("Selecione ao menos um perfil de destino.", "erro");
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
      flash(json.error ?? "Falha ao salvar edição", "erro");
    } else {
      setEditingId(null);
      flash("Texto e destinos atualizados.", "ok");
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
      flash("Texto copiado. Cole na rede e, em seguida, marque como publicado.", "ok");
    } catch {
      flash("Não foi possível copiar. Selecione o texto manualmente.", "erro");
    }
  }

  async function copiarLink(post: DigitalPost) {
    const link = primeiroLink(post);
    if (!link) {
      flash("Este post não tem link para copiar.", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      flash("Link copiado.", "ok");
    } catch {
      flash("Não foi possível copiar o link.", "erro");
    }
  }

  async function publicarNoInstagram(post: DigitalPost) {
    if (!post.media_url || !/^https?:\/\//i.test(post.media_url)) {
      flash(
        "Informe uma URL pública de imagem no post antes de publicar no Instagram.",
        "erro"
      );
      return;
    }
    const temIg = (post.targets ?? []).some((t) => t.platform === "instagram");
    if (!temIg) {
      flash("Inclua o perfil Instagram nos destinos deste post.", "erro");
      return;
    }
    setBusy(true);
    setAviso(null);
    const res = await fetch("/api/admin/digital/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha ao publicar no Instagram", "erro");
    } else {
      flash(
        json.aviso ??
          `Publicado no Instagram${json.media_id ? ` (id ${json.media_id})` : ""}.`,
        "ok"
      );
      await carregar();
    }
    setBusy(false);
  }

  /** Enfileira para o worker no PC (não executa Playwright nesta requisição). */
  async function publicarAgoraWorker(post: DigitalPost) {
    setBusy(true);
    setAviso(null);
    const res = await fetch("/api/admin/digital/posts/publish-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id, dry_run: false }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha ao enfileirar", "erro");
    } else {
      flash(
        json.message ??
          "Enfileirado. Se o agente estiver online, publica em seguida; se offline, fica na fila.",
        "ok"
      );
      await carregar();
    }
    setBusy(false);
  }

  async function repetirFalhas(post: DigitalPost, accountId?: string) {
    setBusy(true);
    setAviso(null);
    const res = await fetch("/api/admin/digital/posts/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: post.id,
        account_id: accountId,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha ao repetir", "erro");
    } else {
      flash(json.message ?? "Retentativa enfileirada.", "ok");
      await carregar();
    }
    setBusy(false);
  }

  async function carregarLogs(postId: string) {
    if (logsOpen === postId) {
      setLogsOpen(null);
      return;
    }
    if (logsData[postId]) {
      setLogsOpen(postId);
      return;
    }
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/digital/posts/${postId}/logs`);
      const json = await res.json();
      if (json.ok) {
        setLogsData((prev) => ({ ...prev, [postId]: json.logs }));
        setLogsOpen(postId);
      } else {
        flash(json.error ?? "Falha ao carregar histórico", "erro");
      }
    } catch {
      flash("Falha de rede ao carregar histórico", "erro");
    }
    setLogsLoading(false);
  }

  function toggleSelectPost(id: string, on: boolean) {
    setSelectedPostIds((prev) =>
      on ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  }

  function selecionarTodosVisiveis() {
    const selectables = posts
      .filter((p) => p.status === "draft" || p.status === "approved" || p.status === "scheduled" || p.status === "published_manual")
      .map((p) => p.id);
    setSelectedPostIds((prev) =>
      prev.length === selectables.length ? [] : selectables
    );
  }

  async function acaoBulk(action: "approve" | "archive") {
    if (selectedPostIds.length === 0) return;
    setBusy(true);
    const res = await fetch("/api/admin/digital/posts/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, post_ids: selectedPostIds }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      flash(json.error ?? "Falha na ação em lote", "erro");
    } else {
      flash(
        `${json.updated} post(s) ${action === "approve" ? "aprovado(s)" : "arquivado(s)"}.`,
        "ok"
      );
      setSelectedPostIds([]);
      await carregar();
    }
    setBusy(false);
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
        <p
          style={{
            ...metaStyle,
            marginTop: adminTokens.spacing.base,
            color:
              avisoTipo === "erro"
                ? "#f87171"
                : avisoTipo === "ok"
                  ? "#86efac"
                  : "#f59e0b",
            padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.sm}px`,
            borderRadius: adminTokens.borderRadius.sm,
            background:
              avisoTipo === "erro"
                ? "rgba(239,68,68,0.08)"
                : avisoTipo === "ok"
                  ? "rgba(134,239,172,0.08)"
                  : "rgba(245,158,11,0.08)",
          }}
        >
          {avisoTipo === "ok" ? "✓ " : avisoTipo === "erro" ? "✕ " : ""}{aviso}
        </p>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Agente de publicação</h2>
        <p style={{ ...metaStyle, marginTop: 0 }}>
          Instalação única no Windows. Depois só use o admin: aprovar →
          «Publicar agora (fila)». Sem script a cada post.
        </p>
        <p style={{ ...metaStyle, marginTop: adminTokens.spacing.sm }}>
          Status:{" "}
          {agentPrimary
            ? agentPrimary.label
            : agentAviso
              ? "sem heartbeat ainda"
              : "consultando…"}
          {agentPrimary?.machine_name
            ? ` · PC: ${agentPrimary.machine_name}`
            : ""}
          {queueWaiting > 0 ? ` · ${queueWaiting} na fila` : ""}
        </p>
        {agentAviso && (
          <p style={{ ...metaStyle, marginTop: adminTokens.spacing.sm, color: "#b45309" }}>
            {agentAviso}
          </p>
        )}
        <div style={{ ...rowStyle, marginTop: adminTokens.spacing.sm }}>
          <button
            type="button"
            style={btnGhost}
            disabled={busy}
            onClick={() => void carregarAgente()}
          >
            Atualizar status
          </button>
          <button
            type="button"
            style={btnStyle}
            disabled={busy}
            onClick={() => void copiarComandoInstalar()}
          >
            Copiar instalação (uma vez)
          </button>
        </div>
        <p style={{ ...metaStyle, marginTop: adminTokens.spacing.sm }}>
          {COMANDO_INSTALAR_AGENTE}
        </p>
      </div>

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
              accounts.map((a) => {
                const editandoPerfil = editingAccountId === a.id;
                return (
                  <div
                    key={a.id}
                    style={{
                      borderBottom: "1px solid #334155",
                      padding: `${adminTokens.spacing.sm}px 0`,
                    }}
                  >
                    {editandoPerfil ? (
                      <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
                        <input
                          style={inputStyle}
                          value={editAccLabel}
                          onChange={(e) => setEditAccLabel(e.target.value)}
                          placeholder="Rótulo"
                          aria-label="Rótulo do perfil"
                        />
                        <input
                          style={inputStyle}
                          value={editAccHref}
                          onChange={(e) => setEditAccHref(e.target.value)}
                          placeholder="Endereço (URL)"
                          aria-label="URL do perfil"
                        />
                        <input
                          style={inputStyle}
                          value={editAccHandle}
                          onChange={(e) => setEditAccHandle(e.target.value)}
                          placeholder="Identificador na rede (opcional)"
                          aria-label="Identificador na rede"
                        />
                        {a.scope === "projeto" && (
                          <input
                            style={inputStyle}
                            value={editAccProjetoRef}
                            onChange={(e) => setEditAccProjetoRef(e.target.value)}
                            placeholder="Referência do projeto"
                            aria-label="Referência do projeto"
                          />
                        )}
                        <div style={rowStyle}>
                          <button
                            type="button"
                            style={btnStyle}
                            disabled={
                              busy ||
                              !editAccLabel.trim() ||
                              !editAccHref.trim()
                            }
                            onClick={() => void salvarEdicaoPerfil(a)}
                          >
                            Salvar perfil
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() => setEditingAccountId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          ...rowStyle,
                          justifyContent: "space-between",
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
                            {a.projeto_ref ? ` / ${a.projeto_ref}` : ""}
                            {a.handle ? ` · ${a.handle}` : ""} ·{" "}
                            {a.ativo ? "ativo" : "inativo"}
                            {a.automation_strategy
                              ? ` · estratégia: ${a.automation_strategy}`
                              : ""}
                            {a.connection_status
                              ? ` · conexão: ${a.connection_status}`
                              : ""}
                            {a.automation_enabled ? " · automação ON" : ""}
                            {a.requires_reconnect ? " · reconectar" : ""}
                            {a.last_connection_error
                              ? ` · erro: ${a.last_connection_error}`
                              : ""}
                            <br />
                            <span style={{ color: "#94a3b8" }}>
                              Última conexão:{" "}
                              {a.last_connected_at
                                ? new Date(a.last_connected_at).toLocaleString(
                                    "pt-BR"
                                  )
                                : "nunca"}
                              {a.last_connection_check_at
                                ? ` · última verificação: ${new Date(
                                    a.last_connection_check_at
                                  ).toLocaleString("pt-BR")}`
                                : ""}
                            </span>
                            <br />
                            <a
                              href={a.href}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#93c5fd" }}
                            >
                              {a.href}
                            </a>
                          </div>
                        </div>
                        <div style={rowStyle}>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() => iniciarEdicaoPerfil(a)}
                          >
                            Editar perfil
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() =>
                              void atualizarAutomacaoConta(a, {
                                action: "request_connect",
                                automation_strategy: "browser",
                              })
                            }
                            title="Marca connecting; login manual no worker (sem senha no IPECC)"
                          >
                            Conectar (browser)
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() =>
                              void atualizarAutomacaoConta(a, {
                                action: "verify_session",
                                automation_strategy: "browser",
                              })
                            }
                            title="O worker confere cookies de sessão (prova real)"
                          >
                            Verificar sessão
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() =>
                              void atualizarAutomacaoConta(a, {
                                action: a.automation_enabled
                                  ? "disable"
                                  : "enable",
                                automation_strategy: "browser",
                              })
                            }
                          >
                            {a.automation_enabled
                              ? "Desativar automação"
                              : "Ativar automação"}
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy}
                            onClick={() => void toggleAtivo(a)}
                          >
                            {a.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
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
              <div style={{ display: "flex", gap: adminTokens.spacing.sm, alignItems: "center" }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="URL de mídia ou link (opcional)"
                  value={manualMedia}
                  onChange={(e) => setManualMedia(e.target.value)}
                />
                <button
                  type="button"
                  style={btnGhost}
                  disabled={busy || uploading}
                  onClick={() => manualFileRef.current?.click()}
                >
                  {uploading ? "Enviando…" : "Upload"}
                </button>
                <input
                  ref={manualFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadMidia(f, setManualMedia);
                    e.target.value = "";
                  }}
                />
              </div>
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
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
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
                onClick={() => { setPage(1); setStatusFilter(value); }}
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

          {selectedPostIds.length > 0 && (
            <div
              style={{
                ...rowStyle,
                marginTop: adminTokens.spacing.base,
                padding: `${adminTokens.spacing.sm}px ${adminTokens.spacing.base}px`,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid #3b82f6",
                borderRadius: adminTokens.borderRadius.md,
              }}
            >
              <span style={{ ...metaStyle, color: "#93c5fd" }}>
                {selectedPostIds.length} selecionado(s)
              </span>
              <button
                type="button"
                style={btnStyle}
                disabled={busy}
                onClick={() => void acaoBulk("approve")}
              >
                Aprovar selecionados
              </button>
              <button
                type="button"
                style={btnGhost}
                disabled={busy}
                onClick={() => void acaoBulk("archive")}
              >
                Arquivar selecionados
              </button>
              <button
                type="button"
                style={btnGhost}
                disabled={busy}
                onClick={() => setSelectedPostIds([])}
              >
                Limpar seleção
              </button>
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ ...rowStyle, justifyContent: "space-between", marginBottom: adminTokens.spacing.sm }}>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Fila editorial</h2>
              <button
                type="button"
                style={btnGhost}
                onClick={selecionarTodosVisiveis}
                disabled={posts.length === 0}
              >
                {selectedPostIds.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            <p style={{ ...metaStyle, marginTop: 0 }}>
              Resumo: {resumo.draft} rascunho(s) · {resumo.approved} aprovado(s)
              · {resumo.scheduled} agendado(s)
              {resumo.scheduled_vencidos > 0
                ? ` (${resumo.scheduled_vencidos} vencido(s))`
                : ""}{" "}
              · {resumo.published_manual} publicado(s)
              {totalPosts > 0 ? ` · página ${page} · ${totalPosts} total` : ""}
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
                    <div style={{ ...rowStyle, marginBottom: 4 }}>
                      {p.status !== "archived" && (
                        <input
                          type="checkbox"
                          checked={selectedPostIds.includes(p.id)}
                          onChange={(e) => toggleSelectPost(p.id, e.target.checked)}
                          aria-label={`Selecionar post ${p.title}`}
                        />
                      )}
                    </div>

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
                        <div style={{ display: "flex", gap: adminTokens.spacing.sm, alignItems: "center" }}>
                          <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={editMedia}
                            onChange={(e) => setEditMedia(e.target.value)}
                            placeholder="URL de mídia ou link (opcional)"
                            aria-label="URL de mídia"
                          />
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={busy || uploading}
                            onClick={() => editFileRef.current?.click()}
                          >
                            {uploading ? "Enviando…" : "Upload"}
                          </button>
                          <input
                            ref={editFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,video/mp4"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadMidia(f, setEditMedia);
                              e.target.value = "";
                            }}
                          />
                        </div>
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
                          {p.published_via === "instagram_api"
                            ? " · via Instagram API"
                            : p.published_via === "manual"
                              ? " · via manual"
                              : ""}
                          {p.external_post_id
                            ? ` · id ${p.external_post_id}`
                            : ""}
                        </div>
                        {p.publish_error && (
                          <div
                            style={{
                              ...metaStyle,
                              marginTop: 4,
                              color: "#f87171",
                            }}
                          >
                            Último erro de publicação: {p.publish_error}
                          </div>
                        )}
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
                              <span
                                key={t.account_id}
                                style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
                              >
                                <a
                                  href={t.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "#93c5fd" }}
                                >
                                  {rotuloPlataforma(t.platform)}
                                </a>
                                {t.publish_status ? (
                                  <span style={{ opacity: 0.85 }}>
                                    ({t.publish_status}
                                    {t.publish_error ? `: ${t.publish_error}` : ""})
                                  </span>
                                ) : null}
                                {t.external_post_url ? (
                                  <a
                                    href={t.external_post_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#86efac" }}
                                  >
                                    URL
                                  </a>
                                ) : null}
                                {(t.publish_status === "failed" ||
                                  t.publish_status === "reconnect_required") && (
                                  <button
                                    type="button"
                                    style={btnGhost}
                                    disabled={busy}
                                    onClick={() =>
                                      void repetirFalhas(p, t.account_id)
                                    }
                                  >
                                    Repetir
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {p.automation_status ? (
                          <div style={{ ...metaStyle, marginTop: 4 }}>
                            Automação:{" "}
                            {rotuloAutomacao(p.automation_status, {
                              agentOnline: agentPrimary?.online,
                            })}
                            {p.last_publish_error
                              ? ` — ${p.last_publish_error}`
                              : ""}
                          </div>
                        ) : null}
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
                    <div style={{ ...rowStyle, marginTop: adminTokens.spacing.sm }}>
                      <button
                        type="button"
                        style={btnGhost}
                        disabled={logsLoading}
                        onClick={() => void carregarLogs(p.id)}
                      >
                        {logsOpen === p.id ? "Ocultar histórico" : "Ver histórico"}
                      </button>
                    </div>

                    {logsOpen === p.id && (
                      <div
                        style={{
                          ...cardStyle,
                          marginTop: adminTokens.spacing.sm,
                          padding: adminTokens.spacing.sm,
                        }}
                      >
                        <p style={{ ...metaStyle, marginBottom: 6, fontWeight: 600 }}>
                          Histórico de publicação
                        </p>
                        {(logsData[p.id] ?? []).length === 0 ? (
                          <p style={metaStyle}>Nenhum evento registrado.</p>
                        ) : (
                          (logsData[p.id] ?? []).map((log) => (
                            <div
                              key={log.id}
                              style={{
                                borderLeft: `3px solid ${
                                  log.severity === "error"
                                    ? "#ef4444"
                                    : log.severity === "warn"
                                      ? "#f59e0b"
                                      : "#3b82f6"
                                }`,
                                paddingLeft: 8,
                                marginBottom: 6,
                              }}
                            >
                              <div style={{ ...metaStyle, color: "#e5e7eb", fontSize: 11 }}>
                                <strong>{log.event_type}</strong>
                                {log.platform ? ` · ${log.platform}` : ""}
                                {" · "}
                                {new Date(log.created_at).toLocaleString("pt-BR")}
                              </div>
                              <div style={metaStyle}>{log.message}</div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div style={{ ...metaStyle, color: "#64748b", fontSize: 10 }}>
                                  {JSON.stringify(log.details)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
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
                          {(p.status === "approved" ||
                            p.status === "scheduled") && (
                            <button
                              type="button"
                              style={btnStyle}
                              disabled={busy}
                              onClick={() => void publicarAgoraWorker(p)}
                              title="Enfileira para o agente no PC. Se o PC estiver off, fica na fila."
                            >
                              Publicar agora (fila)
                            </button>
                          )}
                          {(p.status === "approved" ||
                            p.status === "scheduled") && (
                            <button
                              type="button"
                              style={btnStyle}
                              disabled={busy}
                              onClick={() => void publicarNoInstagram(p)}
                              title={
                                !p.media_url
                                  ? "Requer URL pública de imagem"
                                  : "Legado: Graph API"
                              }
                            >
                              Publicar no Instagram (legado)
                            </button>
                          )}
                          {(p.automation_status === "failed" ||
                            p.automation_status === "partially_published") && (
                            <button
                              type="button"
                              style={btnGhost}
                              disabled={busy}
                              onClick={() => void repetirFalhas(p)}
                            >
                              Repetir falhas
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
            {totalPosts > 0 && (
              <div style={{ ...rowStyle, marginTop: adminTokens.spacing.base, justifyContent: "center" }}>
                <button
                  type="button"
                  style={btnGhost}
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Anterior
                </button>
                <span style={metaStyle}>
                  Página {page} · {totalPosts} post(s) no total
                </span>
                <button
                  type="button"
                  style={btnGhost}
                  disabled={!hasMore || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
