"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";
import AssinarNoAdminModal from "../components/AssinarNoAdminModal";
import AssinarLoteAvancadoModal from "../components/AssinarLoteAvancadoModal";
import AssinarComCertificadoModal from "../components/AssinarComCertificadoModal";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import { carregarProcessosDoEscopo } from "@/lib/auth/processosEscopoCliente";

type Batch = {
  id: string;
  title: string;
  status: string;
  progress_done: number;
  progress_total: number;
  created_at: string;
};

type BatchItem = {
  id: string;
  document_id: string;
  status: string;
  sort_order: number;
  error_message?: string | null;
};

type AdvBatch = {
  id: string;
  status: string;
  item_count: number;
  batch_hash_sha256?: string | null;
  created_at: string;
  completed_at?: string | null;
};

type CertBatch = {
  id: string;
  status: string;
  item_count: number;
  batch_hash_sha256?: string | null;
  created_at: string;
  completed_at?: string | null;
};

type ProcessoOpcao = {
  id: string;
  titulo: string;
};

type DocumentoImportado = {
  id: string;
  fileName: string;
  title: string;
  processoId: string | null;
};

function baseName(fileName: string): string {
  const trimmed = fileName.trim();
  const withoutExt = trimmed.replace(/\.[^.]+$/, "");
  return withoutExt || "Documento";
}

export default function LotesPage() {
  const escopo = useAdminEscopoCliente();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [advBatches, setAdvBatches] = useState<AdvBatch[]>([]);
  const [certBatches, setCertBatches] = useState<CertBatch[]>([]);
  const [processos, setProcessos] = useState<ProcessoOpcao[]>([]);
  const [processoId, setProcessoId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [title, setTitle] = useState("");
  const [docIds, setDocIds] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [documentosImportados, setDocumentosImportados] = useState<
    DocumentoImportado[]
  >([]);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [importandoArquivos, setImportandoArquivos] = useState(false);
  const [ipeccOpen, setIpeccOpen] = useState(false);
  const [advLoteOpen, setAdvLoteOpen] = useState(false);
  const [certLoteOpen, setCertLoteOpen] = useState(false);

  const processoSelecionado = useMemo(() => {
    if (processoId) return processoId;
    return processos[0]?.id || "";
  }, [processoId, processos]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [res, advRes, certRes] = await Promise.all([
      fetch("/api/admin/documentos/lotes", { credentials: "include" }),
      fetch("/api/admin/documentos/lotes-avancados", { credentials: "include" }),
      fetch("/api/admin/documentos/assinaturas-certificado", { credentials: "include" }),
    ]);
    const json = await res.json();
    const advJson = await advRes.json().catch(() => ({}));
    const certJson = await certRes.json().catch(() => ({}));
    if (res.ok) {
      setBatches(json.batches || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar lotes.");
    }
    if (advRes.ok && advJson?.ok) {
      setAdvBatches(advJson.batches || []);
    } else {
      setAdvBatches([]);
    }
    if (certRes.ok && certJson?.ok) {
      setCertBatches(certJson.batches || []);
    } else {
      setCertBatches([]);
    }
    setLoading(false);
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/documentos/lotes?id=${id}`, {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao carregar lote.");
      return;
    }
    setSelectedId(id);
    setItems(json.items || []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    let ativo = true;

    async function carregarProcessos() {
      if (escopo.loading) return;
      const lista = await carregarProcessosDoEscopo();
      if (!ativo) return;
      setProcessos(lista);
      setProcessoId((current) => current || lista[0]?.id || "");
    }

    void carregarProcessos();
    return () => {
      ativo = false;
    };
  }, [escopo.loading, escopo.processoIds]);

  function atualizarArquivosSelecionados(files: FileList | null) {
    const novos = Array.from(files || []).filter(
      (file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name)
    );
    setArquivos((prev) => {
      const nomesExistentes = new Set(prev.map((f) => f.name));
      const unicos = novos.filter((f) => !nomesExistentes.has(f.name));
      const total = [...prev, ...unicos];
      setAviso(
        total.length
          ? `${total.length} arquivo(s) na fila. Selecione mais ou clique em Gerar IDs.`
          : ""
      );
      return total;
    });
    setDocumentosImportados([]);
    setDocIds("");
  }

  function removerArquivo(nome: string) {
    setArquivos((prev) => {
      const total = prev.filter((f) => f.name !== nome);
      setAviso(
        total.length ? `${total.length} arquivo(s) na fila.` : ""
      );
      return total;
    });
  }

  async function importarArquivosComoDocumentos(): Promise<boolean> {
    if (!arquivos.length) {
      setAviso("Escolha ao menos um PDF para gerar os documentos.");
      return false;
    }

    const pid =
      processoSelecionado || (escopo.mestre ? processos[0]?.id || "" : "");
    if (!pid) {
      setAviso(
        "Não encontrei um processo ativo no seu escopo. Escolha um processo antes de importar os PDFs."
      );
      return false;
    }

    setImportandoArquivos(true);
    setAviso("");
    const importados: DocumentoImportado[] = [];

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const file = arquivos[i];
        const titulo = `${baseName(file.name)}${arquivos.length > 1 ? ` ${i + 1}` : ""}`.trim();

        const createRes = await fetch("/api/admin/documentos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titulo,
            description: `Arquivo importado para assinatura: ${file.name}`,
            processo_id: pid,
            status: "draft",
          }),
        });
        const createJson = (await createRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          document?: { id: string };
        };
        if (!createRes.ok || !createJson.ok || !createJson.document?.id) {
          throw new Error(
            createJson.error ||
              `Falha ao criar documento para ${file.name}.`
          );
        }

        const form = new FormData();
        form.append("file", file, file.name);
        form.append("file_name", file.name);
        form.append("change_note", "Upload inicial para assinatura");

        const uploadRes = await fetch(
          `/api/admin/documentos/${encodeURIComponent(createJson.document.id)}/upload`,
          {
            method: "POST",
            credentials: "include",
            body: form,
          }
        );
        const uploadJson = (await uploadRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!uploadRes.ok || !uploadJson.ok) {
          throw new Error(
            uploadJson.error ||
              `Falha ao enviar o arquivo ${file.name}.`
          );
        }

        importados.push({
          id: createJson.document.id,
          fileName: file.name,
          title: titulo,
          processoId: pid,
        });
      }

      const ids = importados.map((doc) => doc.id);
      setDocumentosImportados(importados);
      setDocIds(ids.join(","));
      setTitle((current) => current || `Lote de assinatura ${new Date().toLocaleDateString("pt-BR")}`);
      setAviso(
        `${importados.length} documento(s) criado(s) com sucesso. Os IDs foram gerados pelo sistema e já ficaram prontos para assinatura.`
      );
      await carregar();
      if (ids.length === 1) {
        setSelectedId(ids[0]);
      }
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao importar os arquivos.");
      return false;
    } finally {
      setImportandoArquivos(false);
    }
    return true;
  }

  async function criar() {
    const document_ids = docIds
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/admin/documentos/lotes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        document_ids,
        provider_code: "ipecc",
        processo_id: processoSelecionado || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar lote.");
      return;
    }
    setTitle("");
    setDocIds("");
    setArquivos([]);
    setDocumentosImportados([]);
    await carregar();
    if (json.batch?.id) await carregarDetalhe(json.batch.id);
  }

  async function atualizarStatus(status: string) {
    if (!selectedId) return;
    const res = await fetch("/api/admin/documentos/lotes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, status }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao atualizar lote.");
      return;
    }
    setAviso(`Lote marcado como ${status}.`);
    await carregar();
    await carregarDetalhe(selectedId);
  }

  async function excluir(id: string) {
    if (!confirm("Cancelar e arquivar este lote?")) return;
    const res = await fetch(`/api/admin/documentos/lotes?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao excluir.");
      return;
    }
    setSelectedId(null);
    setItems([]);
    carregar();
  }

  async function enviarLoteDocumento() {
    if (!selectedId) return;
    if (!signerEmail.trim()) {
      setAviso("Informe o e-mail do signatário para enviar o lote (legado).");
      return;
    }
    const res = await fetch(
      `/api/admin/documentos/lotes/${selectedId}/enviar`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_email: signerEmail.trim(),
          signer_name: signerName.trim() || undefined,
        }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao enviar lote.");
      return;
    }
    setAviso(
      json.aviso ||
        `Lote enviado: ${json.result?.done || 0}/${json.result?.total || 0}.`
    );
    await carregar();
    await carregarDetalhe(selectedId);
  }

  return (
    <GestaoDocumentalShell
      title="Lotes"
      description="Assinatura em lote com motor IPECC (uma autenticação para vários documentos). Envios Documento ficam como legado."
    >
      <AssinarNoAdminModal
        open={ipeccOpen}
        batchId={selectedId}
        title="Assinar lote (IPECC)"
        onClose={() => setIpeccOpen(false)}
        onCompleted={() => {
          setAviso("Lote processado — atualizando…");
          if (selectedId) void carregarDetalhe(selectedId);
          void carregar();
        }}
      />
      <AssinarLoteAvancadoModal
        open={advLoteOpen}
        documentIds={docIds
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)}
        onClose={() => setAdvLoteOpen(false)}
        onCompleted={() => {
          setAviso("Lote avançado processado.");
          void carregar();
        }}
      />
      <AssinarComCertificadoModal
        open={certLoteOpen}
        documentIds={docIds
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)}
        documentNames={Object.fromEntries(
          documentosImportados.map((d) => [d.id, d.fileName])
        )}
        onClose={() => setCertLoteOpen(false)}
        onCompleted={() => {
          setAviso("Lote com certificado processado.");
          void carregar();
        }}
      />

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Novo lote
        </h2>
        <div style={{ display: "grid", gap: 10, maxWidth: 680 }}>
          <input
            style={gdInputStyle}
            placeholder="Título do lote"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div
            style={{
              border: "1px solid #334155",
              borderRadius: 12,
              padding: 12,
              background: "rgba(15,23,42,0.45)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Upload de PDFs
            </div>
            <p style={{ fontSize: 12, opacity: 0.85, marginTop: 0, marginBottom: 10 }}>
              O sistema vai criar o documento, receber o arquivo e gerar o ID
              automaticamente. Você não precisa copiar nada no navegador.
            </p>
            {processos.length > 1 ? (
              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Processo do upload
                <select
                  value={processoSelecionado}
                  onChange={(e) => setProcessoId(e.target.value)}
                  style={{ ...gdInputStyle, marginTop: 6 }}
                >
                  {processos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => atualizarArquivosSelecionados(e.target.files)}
              style={{
                ...gdInputStyle,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
            {arquivos.length > 0 && documentosImportados.length === 0 ? (
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
                <strong>{arquivos.length} arquivo(s) na fila:</strong>
                <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none" }}>
                  {arquivos.map((f) => (
                    <li key={f.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ flex: 1, opacity: 0.9 }}>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removerArquivo(f.name)}
                        style={{ background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 11 }}>
                  Pode selecionar mais arquivos — eles serão acumulados na fila.
                </p>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#0f766e" }}
                onClick={() => void importarArquivosComoDocumentos()}
                disabled={importandoArquivos || arquivos.length === 0}
              >
                {importandoArquivos ? `Criando... (${documentosImportados.length}/${arquivos.length})` : `Gerar IDs (${arquivos.length || 0} PDF${arquivos.length !== 1 ? "s" : ""})`}
              </button>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#7c3aed" }}
                onClick={async () => {
                  const ok = await importarArquivosComoDocumentos();
                  if (ok) window.setTimeout(() => setCertLoteOpen(true), 0);
                }}
                disabled={importandoArquivos || arquivos.length === 0}
              >
                {importandoArquivos ? `Preparando... (${documentosImportados.length}/${arquivos.length})` : "Gerar IDs e abrir certificado"}
              </button>
            </div>
            {documentosImportados.length > 0 ? (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
                <strong style={{ color: "#6ee7b7" }}>
                  {documentosImportados.length} documento(s) criado(s) com sucesso:
                </strong>
                <ul style={{ margin: "8px 0 0 18px" }}>
                  {documentosImportados.map((doc) => (
                    <li key={doc.id}>
                      {doc.fileName} → {doc.id.slice(0, 8)}…
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <input
            style={gdInputStyle}
            placeholder="IDs dos documentos (preenchido automaticamente pelo upload)"
            value={docIds}
            readOnly
          />
          <input
            style={gdInputStyle}
            placeholder="E-mail (só para envio legado Documento)"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
          />
          <input
            style={gdInputStyle}
            placeholder="Nome do signatário (opcional)"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={gdBtnStyle} onClick={criar}>
              Criar lote (simples IPECC)
            </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#1d4ed8" }}
              onClick={() => {
                if (!docIds.trim()) { setAviso("Importe os PDFs ou informe os IDs antes de assinar em lote."); return; }
                setAdvLoteOpen(true);
              }}
            >
              Assinar lote avançado
            </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#7c3aed" }}
              onClick={() => {
                if (!docIds.trim()) { setAviso("Importe os PDFs ou informe os IDs antes de assinar com certificado."); return; }
                setCertLoteOpen(true);
              }}
            >
              Assinar lote com certificado
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 0 }}>
            Faça o upload dos PDFs acima para gerar os IDs automaticamente, depois
            escolha o tipo de assinatura. O .pfx continua só no seu computador.
          </p>
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Lotes simples (IPECC)
        </h2>
        {loading ? <p>Carregando...</p> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {batches.map((b) => (
            <li
              key={b.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => carregarDetalhe(b.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#e5e7eb",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <strong>{b.title}</strong> · {b.status} · {b.progress_done}/
                {b.progress_total}
              </button>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#7f1d1d" }}
                onClick={() => excluir(b.id)}
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Lotes avançados
        </h2>
        {!loading && advBatches.length === 0 ? (
          <p style={{ opacity: 0.8, marginBottom: 0 }}>
            Nenhum lote avançado seu ainda. Use &quot;Assinar lote avançado&quot;
            com os IDs acima.
          </p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {advBatches.map((b) => (
            <li
              key={b.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                fontSize: 14,
              }}
            >
              <strong>{b.status}</strong>
              {" · "}
              {b.item_count} documento(s)
              {" · "}
              {new Date(b.created_at).toLocaleString("pt-BR")}
              {b.batch_hash_sha256 ? (
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Hash: {b.batch_hash_sha256.slice(0, 16)}…
                </div>
              ) : null}
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                id {b.id}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Lotes com certificado digital
        </h2>
        {!loading && certBatches.length === 0 ? (
          <p style={{ opacity: 0.8, marginBottom: 0 }}>
            Nenhum lote com certificado seu ainda. Use &quot;Assinar lote com
            certificado&quot; com os IDs acima.
          </p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {certBatches.map((b) => (
            <li
              key={b.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                fontSize: 14,
              }}
            >
              <strong
                style={{
                  color:
                    b.status === "COMPLETED"
                      ? "#6ee7b7"
                      : b.status === "PARTIAL"
                        ? "#fbbf24"
                        : b.status === "FAILED"
                          ? "#fca5a5"
                          : "#e2e8f0",
                }}
              >
                {b.status}
              </strong>
              {" · "}
              {b.item_count} documento(s)
              {" · "}
              {new Date(b.created_at).toLocaleString("pt-BR")}
              {b.completed_at ? (
                <span style={{ opacity: 0.75 }}>
                  {" · concluído "}
                  {new Date(b.completed_at).toLocaleString("pt-BR")}
                </span>
              ) : null}
              {b.batch_hash_sha256 ? (
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Hash: {b.batch_hash_sha256.slice(0, 16)}…
                </div>
              ) : null}
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                id {b.id}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selectedId ? (
        <div style={gdCardStyle}>
          <h2 className="admin-h2" style={{ marginTop: 0 }}>
            Detalhe do lote
          </h2>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#0f766e" }}
              onClick={() => setIpeccOpen(true)}
            >
              Assinar lote (IPECC)
            </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#7c3aed" }}
              onClick={() => {
                const ids = items.map((i) => i.document_id).filter(Boolean);
                setDocIds(ids.join(","));
                setCertLoteOpen(true);
              }}
            >
              Assinar com certificado
            </button>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => atualizarStatus("ready")}
            >
              Marcar pronto
            </button>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={enviarLoteDocumento}
            >
              Enviar lote (legado Documento)
            </button>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                #{item.sort_order} · {item.document_id.slice(0, 8)}… ·{" "}
                {item.status}
                {item.error_message ? ` — ${item.error_message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </GestaoDocumentalShell>
  );
}
