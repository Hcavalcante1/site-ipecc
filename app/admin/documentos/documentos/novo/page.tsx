"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../../components/GestaoDocumentalShell";

export default function NovoDocumentoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSaving(true);
    setErro("");
    const res = await fetch("/api/admin/documentos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        number: number || null,
        description: description || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErro(json.error || "Erro ao criar documento.");
      return;
    }
    router.push(`/admin/documentos/documentos/${json.document.id}`);
  }

  return (
    <GestaoDocumentalShell
      title="Novo documento"
      description="Cadastre metadados. O arquivo pode ser enviado na tela seguinte."
    >
      <div style={gdCardStyle}>
        <label>Título</label>
        <input
          style={{ ...gdInputStyle, marginTop: 6, marginBottom: 12 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Contrato de parceria"
        />
        <label>Número</label>
        <input
          style={{ ...gdInputStyle, marginTop: 6, marginBottom: 12 }}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Opcional"
        />
        <label>Descrição</label>
        <textarea
          style={{
            ...gdInputStyle,
            marginTop: 6,
            marginBottom: 12,
            minHeight: 100,
          }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Resumo interno"
        />
        {erro ? (
          <p style={{ color: "#fca5a5", marginBottom: 12 }}>{erro}</p>
        ) : null}
        <button
          type="button"
          style={gdBtnStyle}
          disabled={saving || !title.trim()}
          onClick={salvar}
        >
          {saving ? "Salvando..." : "Criar documento"}
        </button>
      </div>
    </GestaoDocumentalShell>
  );
}
