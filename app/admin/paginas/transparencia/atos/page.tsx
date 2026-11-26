"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { confirmAction } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";

const CATEGORIAS = [
  "Assembleia",
  "Ata",
  "Resolução",
  "Portaria",
  "Estatuto e alterações",
  "Comunicado institucional",
  "Outro",
] as const;

type Ato = {
  id: string;
  titulo: string;
  categoria: string;
  resumo: string;
  arquivo: string;
  data: string | null;
  publicado: boolean;
  publicado_em: string | null;
  criado_em: string;
};

type FormState = {
  id: string;
  titulo: string;
  categoria: string;
  resumo: string;
  data: string;
  arquivo: string;
  publicado: boolean;
  criado_em: string;
};

type DocumentoExistente = {
  titulo: string;
  arquivo: string;
};

const EMPTY_FORM: FormState = {
  id: "",
  titulo: "",
  categoria: "Assembleia",
  resumo: "",
  data: "",
  arquivo: "",
  publicado: false,
  criado_em: "",
};

function slugArquivo(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "documento";
}

function dataLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("pt-BR").format(date);
}

function arquivoHref(path: string) {
  return `/api/download/public/docs/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function novoIdAto() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ato-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function AtosAdministrativosAdminPage() {
  const [atos, setAtos] = useState<Ato[]>([]);
  const [documentosExistentes, setDocumentosExistentes] = useState<DocumentoExistente[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const response = await fetch("/api/admin/atos-administrativos", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Falha ao carregar o mural.");
      setAtos(Array.isArray(json.atos) ? json.atos : []);
      setDocumentosExistentes(Array.isArray(json.documentosExistentes) ? json.documentosExistentes : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar o mural.";
      setErro(message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  function editar(ato: Ato) {
    setForm({
      id: ato.id,
      titulo: ato.titulo,
      categoria: ato.categoria,
      resumo: ato.resumo,
      data: ato.data || "",
      arquivo: ato.arquivo,
      publicado: ato.publicado,
      criado_em: ato.criado_em,
    });
    setArquivoNovo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removerUpload(path: string) {
    await fetch(`/api/admin/atos-administrativos?arquivo=${encodeURIComponent(path)}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (!form.titulo.trim()) return setErro("Informe o título do ato.");
    if (form.publicado && !arquivoNovo && !form.arquivo) {
      return setErro("Inclua o PDF antes de publicar o ato.");
    }

    setSalvando(true);
    let arquivoEnviado = "";
    try {
      let arquivo = form.arquivo;
      if (arquivoNovo) {
        if (arquivoNovo.type !== "application/pdf" || !arquivoNovo.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("Envie o documento assinado em formato PDF.");
        }
        const nome = slugArquivo(arquivoNovo.name.replace(/\.pdf$/i, ""));
        arquivoEnviado = `atos-administrativos/${Date.now()}-${nome}.pdf`;
        const upload = new FormData();
        upload.set("bucket", "docs");
        upload.set("path", arquivoEnviado);
        upload.set("file", arquivoNovo);
        upload.set("contentType", "application/pdf");
        const uploadResponse = await fetch("/api/admin/storage/upload", {
          method: "POST",
          credentials: "include",
          body: upload,
        });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadJson.ok) {
          throw new Error(uploadJson.error || "Não foi possível enviar o PDF.");
        }
        arquivo = arquivoEnviado;
      }

      const ato: Ato = {
        id: form.id || novoIdAto(),
        titulo: form.titulo.trim(),
        categoria: form.categoria,
        resumo: form.resumo.trim(),
        arquivo,
        data: form.data || null,
        publicado: form.publicado,
        publicado_em: form.publicado ? new Date().toISOString() : null,
        criado_em: form.criado_em || new Date().toISOString(),
      };
      const proximaLista = form.id
        ? atos.map((item) => item.id === form.id ? ato : item)
        : [ato, ...atos];
      const response = await fetch("/api/admin/atos-administrativos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atos: proximaLista }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Não foi possível salvar o ato.");
      setAtos(json.atos);
      setForm(EMPTY_FORM);
      setArquivoNovo(null);
      triggerToast(
        json.warning || (ato.publicado ? "Ato publicado na Transparência." : "Rascunho salvo."),
        json.warning ? "error" : "success"
      );
    } catch (error) {
      if (arquivoEnviado) await removerUpload(arquivoEnviado);
      const message = error instanceof Error ? error.message : "Falha ao salvar o ato.";
      setErro(message);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarPublicacao(ato: Ato, publicado: boolean) {
    if (publicado && !ato.arquivo) {
      triggerToast("Anexe um PDF antes de publicar.", "error");
      return;
    }
    const proximaLista = atos.map((item) => item.id === ato.id
      ? { ...item, publicado, publicado_em: publicado ? new Date().toISOString() : null }
      : item);
    const response = await fetch("/api/admin/atos-administrativos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atos: proximaLista }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      triggerToast(json.error || "Não foi possível atualizar a publicação.", "error");
      return;
    }
    setAtos(json.atos);
    triggerToast(json.warning || (publicado ? "Ato publicado." : "Ato retirado da página pública."), json.warning ? "error" : "success");
  }

  async function excluir(ato: Ato) {
    if (!(await confirmAction(`Excluir “${ato.titulo}” e o PDF armazenado?`))) return;
    const response = await fetch("/api/admin/atos-administrativos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atos: atos.filter((item) => item.id !== ato.id) }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      triggerToast(json.error || "Não foi possível excluir o ato.", "error");
      return;
    }
    setAtos(json.atos);
    if (form.id === ato.id) setForm(EMPTY_FORM);
    triggerToast(json.warning || "Ato e PDF excluídos.", json.warning ? "error" : "success");
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Atos Administrativos da Entidade</h1>
      <p className="admin-subtitle">
        Publique convocações, atas, resoluções, portarias e outros atos institucionais na página Transparência.
        Este mural não cria edital nem processo de propostas.
      </p>

      <form className="admin-card" onSubmit={salvar}>
        <h2 className="admin-h2">{form.id ? "Editar ato" : "Cadastrar ato"}</h2>
        <label htmlFor="ato-titulo">Título</label>
        <input id="ato-titulo" value={form.titulo} maxLength={240} onChange={(event) => setForm({ ...form, titulo: event.target.value })} required />

        <label htmlFor="ato-categoria">Tipo de ato</label>
        <select id="ato-categoria" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}>
          {CATEGORIAS.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
        </select>

        <label htmlFor="ato-data">Data do ato</label>
        <input id="ato-data" type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} />

        <label htmlFor="ato-resumo">Descrição (opcional)</label>
        <textarea id="ato-resumo" rows={3} maxLength={3000} value={form.resumo} onChange={(event) => setForm({ ...form, resumo: event.target.value })} />

        <label htmlFor="ato-arquivo">Documento assinado (PDF)</label>
        <input id="ato-arquivo" type="file" accept="application/pdf,.pdf" onChange={(event) => {
          const file = event.target.files?.[0] || null;
          setArquivoNovo(file);
          if (file) setForm((current) => ({ ...current, arquivo: "" }));
        }} />
        {documentosExistentes.length > 0 && (
          <>
            <label htmlFor="ato-arquivo-existente">Ou vincule um PDF já publicado em Editais</label>
            <select
              id="ato-arquivo-existente"
              value={arquivoNovo ? "" : form.arquivo}
              onChange={(event) => {
                setArquivoNovo(null);
                setForm((current) => ({ ...current, arquivo: event.target.value }));
              }}
            >
              <option value="">Selecione um documento existente</option>
              {documentosExistentes.map((documento) => (
                <option key={documento.arquivo} value={documento.arquivo}>{documento.titulo}</option>
              ))}
            </select>
          </>
        )}
        {form.arquivo && !arquivoNovo && <p>PDF atual: <a href={arquivoHref(form.arquivo)} target="_blank" rel="noreferrer">Abrir documento</a></p>}

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
          <input type="checkbox" checked={form.publicado} onChange={(event) => setForm({ ...form, publicado: event.target.checked })} />
          Publicar na página Transparência
        </label>

        {erro && <p role="alert" style={{ color: "#fca5a5" }}>{erro}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button className="admin-button" type="submit" disabled={salvando}>{salvando ? "Salvando…" : form.publicado ? "Salvar e publicar" : "Salvar rascunho"}</button>
          {form.id && <button className="admin-button" type="button" onClick={() => { setForm(EMPTY_FORM); setArquivoNovo(null); }}>Cancelar edição</button>}
        </div>
      </form>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Atos cadastrados</h2>
        {carregando ? <p>Carregando…</p> : erro && !atos.length ? <p>{erro}</p> : atos.length === 0 ? <p>Nenhum ato cadastrado.</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            {atos.map((ato) => (
              <article key={ato.id} style={{ border: "1px solid rgba(148,163,184,.25)", borderRadius: 12, padding: 16 }}>
                <strong>{ato.titulo}</strong>
                <p style={{ margin: "6px 0", color: "#94a3b8" }}>{ato.categoria}{ato.data ? ` · ${dataLabel(ato.data)}` : ""} · {ato.publicado ? "Publicado" : "Rascunho"}</p>
                {ato.arquivo && <a href={arquivoHref(ato.arquivo)} target="_blank" rel="noreferrer">Abrir PDF</a>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button type="button" className="admin-button" onClick={() => editar(ato)}>Editar</button>
                  <button type="button" className="admin-button" onClick={() => void alterarPublicacao(ato, !ato.publicado)}>{ato.publicado ? "Retirar do público" : "Publicar"}</button>
                  <button type="button" className="admin-button" style={{ background: "#b91c1c" }} onClick={() => void excluir(ato)}>Excluir</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
