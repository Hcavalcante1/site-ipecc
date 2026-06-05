"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { adminStorageUpload } from "@/lib/admin/storageUploadClient";
import { adminTokens } from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

// Normaliza nome do arquivo para storage
function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

const h2CadastradosStyle: CSSProperties = {
  marginTop: adminTokens.spacing.base + adminTokens.spacing.xl,
};

const cardListaStyle: CSSProperties = {
  marginTop: adminTokens.spacing.md,
};

const acoesRowStyle: CSSProperties = {
  display: "flex",
  gap: adminTokens.spacing.md,
  marginTop: adminTokens.spacing.md,
};

const excluirBtnStyle: CSSProperties = {
  background: adminTokens.colors.error.background,
  color: adminTokens.colors.error.text,
};

export default function AdminEditais() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState("Chamamento público");

  const [status, setStatus] = useState<"aberto" | "encerrado" | "em_breve">(
    "aberto"
  );

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editais, setEditais] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data, error } = await supabase
      .from("editais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR:", error);
      return;
    }

    setEditais(data || []);
  }

  async function salvarEdital() {
    setLoading(true);
    setMsg("");

    try {
      if (!titulo.trim()) {
        setMsg("Preencha o titulo do edital.");
        setLoading(false);
        return;
      }

      if (!descricao.trim()) {
        setMsg("Preencha a descricao do edital.");
        setLoading(false);
        return;
      }

      if (!periodo.trim()) {
        setMsg("Preencha o periodo do edital.");
        setLoading(false);
        return;
      }

      if (!arquivo) {
        setMsg("Selecione o arquivo PDF do edital.");
        setLoading(false);
        return;
      }

      const nomeSeguro = normalizarNomeArquivo(arquivo.name);
      const nomeArquivoEdital = `${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await adminStorageUpload(
        "editais",
        nomeArquivoEdital,
        arquivo,
        {
          upsert: true,
          contentType: "application/pdf",
        }
      );

      if (uploadError) {
        console.error("UPLOAD PDF:", uploadError);
        setMsg(`Erro ao enviar PDF: ${uploadError.message}`);
        return;
      }

      const { error } = await supabase.from("editais").insert({
        titulo,
        descricao,
        periodo,
        periodo_envio: periodo,
        tipo,
        status,
        ativo: true,
        arquivo_pdf: nomeArquivoEdital,
      });

      if (error) {
        console.error("INSERT:", error);
        setMsg(`Erro ao salvar edital: ${error.message}`);
        return;
      }

      setMsg("Edital salvo com sucesso.");
      setTitulo("");
      setDescricao("");
      setPeriodo("");
      setTipo("Chamamento público");
      setStatus("aberto");
      setArquivo(null);

      await carregar();
    } catch (error) {
      console.error("ERRO AO SALVAR EDITAL:", error);
      setMsg("Erro inesperado ao salvar edital.");
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Deseja excluir este edital?")) return;

    const { error } = await supabase
      .from("editais")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("ERRO AO EXCLUIR:", error);
      alert(error.message);
      return;
    }

    alert("Edital excluído com sucesso");

    await carregar();
  }

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Editais e Chamadas Públicas</h1>

      <p className="admin-subtitle">
        Cadastre aqui a abertura oficial do edital e o PDF publicado em /editais.
        As fases posteriores de seleção, recurso, homologação e contrato são
        registradas na área de Transparência.
      </p>
      <p className="admin-subtitle" style={{ marginTop: 8 }}>
        <Link href={adminCanonicalRoutes.editaisCms.hub}>
          Editar textos da página pública Editais →
        </Link>
      </p>

      <h2 className="admin-h2">Cadastrar novo edital</h2>

      <form className="admin-card">
        <label>Título do edital</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Descrição / Texto do edital</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
        />

        <label>Período</label>
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ex: 01/01/2025 a 31/01/2025"
        />

        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="Chamamento público">Chamamento público</option>
          <option value="Edital">Edital</option>
          <option value="Credenciamento">Credenciamento</option>
        </select>

        <label>Status</label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "aberto" | "encerrado" | "em_breve")
          }
        >
          <option value="aberto">Aberto</option>
          <option value="encerrado">Encerrado</option>
          <option value="em_breve">Em breve</option>
        </select>

        <label>Arquivo do edital (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />

        {msg && <p>{msg}</p>}

        <button
          type="button"
          className="admin-button"
          disabled={loading}
          onClick={salvarEdital}
        >
          {loading ? "Salvando..." : "Salvar edital"}
        </button>
      </form>

      <h2 className="admin-h2" style={h2CadastradosStyle}>
        Editais cadastrados
      </h2>

      {editais.map((e) => (
        <div key={e.id} className="admin-card" style={cardListaStyle}>
          <strong>{e.titulo}</strong>

          {e.descricao && <p>{e.descricao}</p>}

          <p><strong>Tipo:</strong> {e.tipo}</p>
          <p><strong>Período:</strong> {e.periodo || "-"}</p>
          <p><strong>Status:</strong> {e.status}</p>

          <div style={acoesRowStyle}>
            
            {/* 🟡 EDITAR */}
            <Link
              className="admin-button"
              style={{ background: "#eab308", color: "#000", textDecoration: "none" }}
              href={adminCanonicalRoutes.editaisCadastro.editar(e.id)}
            >
              Editar
            </Link>

            <Link
              className="admin-button"
              style={{ background: "#0ea5e9", color: "#fff", textDecoration: "none" }}
              href={`/admin/editais/${e.id}/governanca`}
            >
              Governança / fases
            </Link>

            {/* 🔴 EXCLUIR */}
            <button
              className="admin-button"
              style={excluirBtnStyle}
              onClick={() => excluir(e.id)}
            >
              Excluir
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}
