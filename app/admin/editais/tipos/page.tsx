"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { triggerToast } from "@/components/AdminToast";
import { AdminLoadingButton } from "@/components/admin";

type TipoRow = {
  codigo: string;
  label: string;
  descricao: string | null;
  para_publicacao: boolean;
  para_emissao: boolean;
  para_prestacao?: boolean;
  tipo_publicacao_padrao: string | null;
  ativo: boolean;
  sort_order: number;
};

export default function TiposDocumentoPage() {
  const [tipos, setTipos] = useState<TipoRow[]>([]);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paraPublicacao, setParaPublicacao] = useState(true);
  const [paraEmissao, setParaEmissao] = useState(false);
  const [paraPrestacao, setParaPrestacao] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/documentos-tipos?todos=1", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAviso(json.error || "Erro ao carregar tipos.");
        setTipos([]);
        return;
      }
      setTipos(json.tipos || []);
      setAviso(json.aviso || "");
    } catch {
      setAviso("Erro inesperado ao carregar tipos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar() {
    if (!label.trim()) {
      triggerToast("Informe o nome do tipo (ex.: Declaração).", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/documentos-tipos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          codigo: codigo.trim() || undefined,
          para_publicacao: paraPublicacao,
          para_emissao: paraEmissao,
          para_prestacao: paraPrestacao,
          criar_modelo: paraEmissao,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        triggerToast(json.error || "Falha ao criar tipo.", "error");
        return;
      }
      triggerToast("Tipo criado.", "success");
      setLabel("");
      setCodigo("");
      setParaEmissao(false);
      setParaPrestacao(false);
      setParaPublicacao(true);
      await carregar();
    } catch {
      triggerToast("Erro inesperado ao criar tipo.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function setAtivo(codigoTipo: string, ativo: boolean) {
    const res = await fetch("/api/admin/documentos-tipos", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: codigoTipo, ativo }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      triggerToast(json.error || "Falha ao atualizar.", "error");
      return;
    }
    await carregar();
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/admin/editais">← Editais</Link>
      </p>
      <h1 className="admin-h1">Tipos de documento</h1>
      <p>
        Cadastre tipos usados na governança: publicação no edital e geração /
        assinatura (ata, declaração, nota de esclarecimento, etc.).
      </p>

      {aviso ? (
        <p style={{ fontWeight: 700, color: "#b45309" }}>{aviso}</p>
      ) : null}

      <section className="admin-card" style={{ marginTop: 16 }}>
        <h2 className="admin-h2">Criar tipo</h2>
        <label>Nome (exibido)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: Declaração"
        />
        <label>Código (opcional — gerado do nome)</label>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="ex.: declaracao"
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={paraPublicacao}
            onChange={(e) => setParaPublicacao(e.target.checked)}
          />
          Usar ao publicar PDF na governança
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={paraEmissao}
            onChange={(e) => setParaEmissao(e.target.checked)}
          />
          Usar em Gerar / assinar e modelos GD (cria modelo automático)
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={paraPrestacao}
            onChange={(e) => setParaPrestacao(e.target.checked)}
          />
          Usar em Transparência → Prestação de contas
        </label>
        <AdminLoadingButton
          type="button"
          className="admin-button"
          style={{ marginTop: 12 }}
          loading={saving}
          loadingText="Salvando..."
          onClick={criar}
        >
          Criar tipo
        </AdminLoadingButton>
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Tipos cadastrados</h2>
        {loading ? <p>Carregando...</p> : null}
        {!loading && tipos.length === 0 ? (
          <p>Nenhum tipo. Aplique o SQL do catálogo ou crie o primeiro.</p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {tipos.map((t) => (
            <li
              key={t.codigo}
              style={{
                borderTop: "1px solid rgba(255,255,255,.12)",
                padding: "12px 0",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{t.label}</strong>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {t.codigo}
                  {t.para_publicacao ? " · publicação" : ""}
                  {t.para_emissao ? " · emissão" : ""}
                  {t.para_prestacao ? " · prestação" : ""}
                  {!t.ativo ? " · inativo" : ""}
                </div>
              </div>
              <button
                type="button"
                className="admin-button"
                onClick={() => setAtivo(t.codigo, !t.ativo)}
              >
                {t.ativo ? "Desativar" : "Ativar"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
