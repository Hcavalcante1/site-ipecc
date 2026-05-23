"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { adminTokens } from "@/components/admin";
import { triggerToast } from "@/components/AdminToast";
import { logAction } from "@/lib/adminLogger";
import { ANEXOS_URL_PROPOSTA } from "@/lib/documental/propostaPaths";
import { supabase } from "@/lib/supabaseClient";
import { InfoCard } from "./propostaDetailUi";

type Props = {
  propostaId: string;
  onAtualizado: () => Promise<void> | void;
};

async function uploadAnexoAdmin(file: File, chave: string): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Apenas PDF permitido.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Arquivo muito grande (máx 5MB).");
  }

  const nomeLimpo = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const nome = `${Date.now()}-admin-${chave}-${nomeLimpo}`;

  const { error } = await supabase.storage.from("propostas").upload(nome, file);
  if (error) throw error;

  return nome;
}

export function AdminSubstituirAnexoProposta({ propostaId, onAtualizado }: Props) {
  const [chave, setChave] = useState<string>(ANEXOS_URL_PROPOSTA[0].key);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setArquivo(e.target.files?.[0] ?? null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      triggerToast("Selecione um PDF.", "error");
      return;
    }

    setEnviando(true);
    try {
      const path = await uploadAnexoAdmin(arquivo, chave);

      const { error: updateError } = await supabase
        .from("propostas")
        .update({ [chave]: path })
        .eq("id", propostaId);

      if (updateError) throw updateError;

      const syncRes = await fetch("/api/admin/propostas/sincronizar-anexos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostaId }),
      });
      const syncJson = await syncRes.json().catch(() => ({}));

      if (!syncRes.ok && syncRes.status !== 401 && syncRes.status !== 403) {
        throw new Error(
          typeof syncJson.error === "string"
            ? syncJson.error
            : "Falha ao sincronizar proposta_anexos"
        );
      }

      await onAtualizado();
      setArquivo(null);

      await logAction({
        acao: "UPDATE",
        tabela: "propostas",
        registro_id: propostaId,
        detalhes: { tipo: "substituir_anexo", chave, storage_path: path },
      });

      triggerToast("Anexo atualizado com sucesso.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar anexo";
      triggerToast(msg, "error");
    } finally {
      setEnviando(false);
    }
  }

  const inputStyle = {
    width: "100%",
    maxWidth: 420,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "#fff",
    fontSize: 14,
  } as const;

  return (
    <InfoCard title="Substituir anexo (admin)">
      <p
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.md,
          color: adminTokens.colors.text.muted,
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Envia PDF ao storage, atualiza a coluna correspondente e sincroniza{" "}
        <code>proposta_anexos</code> quando a escrita dupla estiver ativa.
      </p>
      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: adminTokens.spacing.md,
          maxWidth: 520,
        }}
      >
        <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
          <span>Tipo de documento</span>
          <select
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            disabled={enviando}
            style={inputStyle}
          >
            {ANEXOS_URL_PROPOSTA.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} ({item.key})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
          <span>Arquivo PDF (máx 5MB)</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={onFileChange}
            disabled={enviando}
            style={{ fontSize: 14, color: adminTokens.colors.text.muted }}
          />
        </label>
        <button
          type="submit"
          disabled={enviando || !arquivo}
          style={{
            width: "fit-content",
            background: enviando ? "#475569" : "#2563eb",
            color: "#fff",
            padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
            borderRadius: 6,
            border: "none",
            cursor: enviando || !arquivo ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {enviando ? "Enviando…" : "Substituir anexo"}
        </button>
      </form>
    </InfoCard>
  );
}
