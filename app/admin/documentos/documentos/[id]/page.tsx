"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  GdDocument,
  GdDocumentLog,
  GdDocumentPermission,
  GdDocumentTag,
  GdDocumentVersion,
  GdPermission,
  GdPreviewKind,
  GdSubjectType,
  GdWorkflow,
  GdWorkflowHistory,
  GdWorkflowStep,
} from "@/lib/documentos/types";
import {
  GD_DOCUMENT_STATUSES,
  GD_PERMISSIONS,
  GD_SUBJECT_TYPES,
} from "@/lib/documentos/types";
import {
  rotuloPermissao,
  rotuloStatus,
  rotuloTipoSujeito,
} from "@/lib/documentos/labels";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../../components/GestaoDocumentalShell";

export default function DocumentoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [document, setDocument] = useState<GdDocument | null>(null);
  const [versions, setVersions] = useState<GdDocumentVersion[]>([]);
  const [tags, setTags] = useState<GdDocumentTag[]>([]);
  const [logs, setLogs] = useState<GdDocumentLog[]>([]);
  const [permissions, setPermissions] = useState<GdDocumentPermission[]>([]);
  const [availableSteps, setAvailableSteps] = useState<GdWorkflowStep[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<GdWorkflowHistory[]>(
    []
  );
  const [workflows, setWorkflows] = useState<GdWorkflow[]>([]);
  const [workflowId, setWorkflowId] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<GdPreviewKind>("unsupported");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [novaTag, setNovaTag] = useState("");
  const [comment, setComment] = useState("");
  const [subjType, setSubjType] = useState<GdSubjectType>("user");
  const [subjId, setSubjId] = useState("");
  const [perm, setPerm] = useState<GdPermission>("consulta");
  const [aviso, setAviso] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/documentos/${id}`, {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao carregar documento.");
      return;
    }
    setDocument(json.document);
    setVersions(json.versions || []);
    setTags(json.tags || []);
    setLogs(json.logs || []);
    setPermissions(json.permissions || []);
    setAvailableSteps(json.availableSteps || []);
    setWorkflowHistory(json.workflowHistory || []);
    setWorkflows(json.workflows || []);
    setWorkflowId(json.workflowId || json.document.workflow_id || "");
    setDownloadUrl(json.downloadUrl || null);
    setPreviewKind(json.previewKind || "unsupported");
    setPreviewText(json.previewText || null);
    setTitle(json.document.title);
    setStatus(json.document.status);
    setAviso("");
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar() {
    setSaving(true);
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setAviso(json.error || "Erro ao salvar.");
      return;
    }
    setDocument(json.document);
    setAviso("Documento atualizado.");
    carregar();
  }

  async function toggleFavorito() {
    if (!document) return;
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !document.favorite }),
    });
    if (!res.ok) {
      const json = await res.json();
      setAviso(json.error || "Erro ao favoritar.");
      return;
    }
    carregar();
  }

  async function enviarArquivo(file: File) {
    setUploading(true);
    setAviso("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/documentos/${id}/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setAviso(json.error || "Erro no envio.");
      return;
    }
    setAviso(`Versão ${json.version.version_number} enviada.`);
    carregar();
  }

  async function aplicarTransicao(stepId: string) {
    setTransitioning(true);
    const res = await fetch(`/api/admin/documentos/${id}/transicao`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_id: stepId,
        workflow_id: workflowId || null,
        comment: comment || null,
      }),
    });
    const json = await res.json();
    setTransitioning(false);
    if (!res.ok) {
      setAviso(json.error || "Erro na transição.");
      return;
    }
    setComment("");
    setAviso(
      `Transição: ${rotuloStatus(json.transition.from_status)} → ${rotuloStatus(json.transition.to_status)}`
    );
    carregar();
  }

  async function vincularFluxo() {
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: workflowId || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao vincular fluxo.");
      return;
    }
    setAviso("Fluxo vinculado ao documento.");
    carregar();
  }

  async function adicionarPermissao() {
    const res = await fetch(`/api/admin/documentos/${id}/permissoes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_type: subjType,
        subject_id: subjId,
        permission: perm,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao adicionar permissão.");
      return;
    }
    setSubjId("");
    carregar();
  }

  async function removerPermissao(permissionId: string) {
    const res = await fetch(
      `/api/admin/documentos/${id}/permissoes?permission_id=${permissionId}`,
      { method: "DELETE", credentials: "include" }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover permissão.");
      return;
    }
    carregar();
  }

  async function adicionarTag() {
    const res = await fetch(`/api/admin/documentos/${id}/tags`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: novaTag }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao adicionar tag.");
      return;
    }
    setNovaTag("");
    carregar();
  }

  async function removerTag(tag: string) {
    const res = await fetch(
      `/api/admin/documentos/${id}/tags?tag=${encodeURIComponent(tag)}`,
      { method: "DELETE", credentials: "include" }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover tag.");
      return;
    }
    carregar();
  }

  async function duplicar() {
    const res = await fetch(`/api/admin/documentos/${id}/duplicar`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao duplicar.");
      return;
    }
    router.push(`/admin/documentos/documentos/${json.document.id}`);
  }

  async function pedirAssinatura() {
    const res = await fetch("/api/admin/documentos/assinaturas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar pedido de assinatura.");
      return;
    }
    router.push(
      `/admin/documentos/assinaturas?signature_id=${json.signature?.id || ""}&document_id=${id}`
    );
  }

  if (!document && !aviso) {
    return (
      <GestaoDocumentalShell title="Documento">
        <p>Carregando...</p>
      </GestaoDocumentalShell>
    );
  }

  return (
    <GestaoDocumentalShell
      title={document?.title || "Documento"}
      description="Preview, tags, versionamento e histórico."
      actions={
        document ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ ...gdBtnStyle, background: "#334155" }} onClick={toggleFavorito}>
              {document.favorite ? "★ Favorito" : "☆ Favoritar"}
            </button>
            <button type="button" style={{ ...gdBtnStyle, background: "#475569" }} onClick={duplicar}>
              Duplicar
            </button>
            {document.storage_path ? (
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#0f766e" }}
                onClick={pedirAssinatura}
              >
                Pedir assinatura
              </button>
            ) : null}
          </div>
        ) : null
      }
    >
      {aviso ? (
        <div
          style={{
            ...gdCardStyle,
            borderColor: aviso.includes("Erro") ? "#ef4444" : "#334155",
          }}
        >
          {aviso}
        </div>
      ) : null}

      {document ? (
        <>
          <div style={gdCardStyle}>
            <label>Título</label>
            <input
              style={{ ...gdInputStyle, marginTop: 6, marginBottom: 12 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label>Status</label>
            <select
              style={{ ...gdInputStyle, marginTop: 6, marginBottom: 12 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {GD_DOCUMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {rotuloStatus(s)}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
              Versão atual: {document.current_version || 0}
              {document.file_hash
                ? ` · SHA256 ${document.file_hash.slice(0, 12)}…`
                : ""}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={gdBtnStyle}
                disabled={saving}
                onClick={salvar}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...gdBtnStyle, background: "#334155" }}
                >
                  Download
                </a>
              ) : null}
            </div>
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Preview
            </h2>
            {!downloadUrl ? (
              <p>Sem arquivo para visualização.</p>
            ) : previewKind === "pdf" ? (
              <iframe
                title="Preview PDF"
                src={downloadUrl}
                style={{
                  width: "100%",
                  minHeight: 480,
                  border: "1px solid #334155",
                  borderRadius: 8,
                  background: "#0f172a",
                }}
              />
            ) : previewKind === "image" ? (
              <img
                src={downloadUrl}
                alt={document.file_name || "Preview"}
                style={{
                  maxWidth: "100%",
                  maxHeight: 480,
                  borderRadius: 8,
                  border: "1px solid #334155",
                }}
              />
            ) : previewKind === "text" ? (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  maxHeight: 420,
                  overflow: "auto",
                  background: "#0f172a",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #334155",
                  fontSize: 13,
                }}
              >
                {previewText || "(conteúdo vazio)"}
              </pre>
            ) : (
              <p>
                Preview não disponível para este tipo (ex.: DOCX). Use o
                download.
              </p>
            )}
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Fluxo de trabalho
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <select
                style={{ ...gdInputStyle, maxWidth: 280 }}
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
              >
                <option value="">Sem fluxo vinculado</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.is_default ? " (padrão)" : ""}
                  </option>
                ))}
              </select>
              <button type="button" style={gdBtnStyle} onClick={vincularFluxo}>
                Vincular fluxo
              </button>
            </div>
            <input
              style={{ ...gdInputStyle, marginBottom: 10 }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentário da transição (opcional)"
            />
            {availableSteps.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.85 }}>
                Nenhuma transição disponível a partir de{" "}
                {rotuloStatus(document.status)}. Crie ou ajuste passos em
                Fluxos.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {availableSteps.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    style={gdBtnStyle}
                    disabled={transitioning}
                    onClick={() => aplicarTransicao(s.id)}
                  >
                    {s.name}
                    {s.to_status ? ` → ${rotuloStatus(s.to_status)}` : ""}
                  </button>
                ))}
              </div>
            )}
            {workflowHistory.length > 0 ? (
              <ul style={{ marginTop: 14, paddingLeft: 18 }}>
                {workflowHistory.map((h) => (
                  <li key={h.id} style={{ marginBottom: 6, fontSize: 13 }}>
                    {h.from_status ? rotuloStatus(h.from_status) : "—"} →{" "}
                    {h.to_status ? rotuloStatus(h.to_status) : "—"}
                    {" · "}
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                    {h.comment ? ` · ${h.comment}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Permissões do documento
            </h2>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 0 }}>
              Sem ACL, quem tem o módulo Documentos pode atuar. Com ACL de
              usuários, só os listados (mais grants de grupo/cargo).
            </p>
            {permissions.length === 0 ? (
              <p style={{ fontSize: 13 }}>Nenhuma permissão específica.</p>
            ) : (
              <ul style={{ paddingLeft: 18 }}>
                {permissions.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6, fontSize: 13 }}>
                    {rotuloTipoSujeito(p.subject_type)} <strong>{p.subject_id}</strong>{" "}
                    → {rotuloPermissao(p.permission)}{" "}
                    <button
                      type="button"
                      style={{
                        ...gdBtnStyle,
                        background: "#ef4444",
                        padding: "2px 8px",
                        fontSize: 12,
                      }}
                      onClick={() => removerPermissao(p.id)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <select
                style={{ ...gdInputStyle, maxWidth: 140 }}
                value={subjType}
                onChange={(e) => setSubjType(e.target.value as GdSubjectType)}
              >
                {GD_SUBJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {rotuloTipoSujeito(t)}
                  </option>
                ))}
              </select>
              <input
                style={{ ...gdInputStyle, maxWidth: 220 }}
                value={subjId}
                onChange={(e) => setSubjId(e.target.value)}
                placeholder="e-mail, UUID, grupo ou cargo"
              />
              <select
                style={{ ...gdInputStyle, maxWidth: 180 }}
                value={perm}
                onChange={(e) => setPerm(e.target.value as GdPermission)}
              >
                {GD_PERMISSIONS.map((p) => (
                  <option key={p} value={p}>
                    {rotuloPermissao(p)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={gdBtnStyle}
                disabled={!subjId.trim()}
                onClick={adicionarPermissao}
              >
                Adicionar
              </button>
            </div>
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Tags
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {tags.length === 0 ? (
                <span style={{ opacity: 0.7, fontSize: 13 }}>Nenhuma tag</span>
              ) : (
                tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => removerTag(t.tag)}
                    style={{
                      ...gdBtnStyle,
                      background: "rgba(59,130,246,0.25)",
                      fontSize: 12,
                    }}
                    title="Clique para remover"
                  >
                    {t.tag} ×
                  </button>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                style={{ ...gdInputStyle, maxWidth: 240 }}
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                placeholder="nova-tag"
              />
              <button
                type="button"
                style={gdBtnStyle}
                disabled={!novaTag.trim()}
                onClick={adicionarTag}
              >
                Adicionar
              </button>
            </div>
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Enviar nova versão
            </h2>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarArquivo(f);
                e.target.value = "";
              }}
            />
            {uploading ? <p style={{ marginTop: 8 }}>Enviando...</p> : null}
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Histórico de versões
            </h2>
            {versions.length === 0 ? (
              <p>Nenhuma versão enviada.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {versions.map((v) => (
                  <li key={v.id} style={{ marginBottom: 6 }}>
                    v{v.version_number} — {v.file_name || "arquivo"}
                    {v.file_hash ? ` (${v.file_hash.slice(0, 10)}…)` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={gdCardStyle}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Histórico de ações
            </h2>
            {logs.length === 0 ? (
              <p>Nenhum evento.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {logs.map((log) => (
                  <li key={log.id} style={{ marginBottom: 6, fontSize: 13 }}>
                    <strong>{log.action}</strong> —{" "}
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                    {log.actor_email ? ` · ${log.actor_email}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </GestaoDocumentalShell>
  );
}
