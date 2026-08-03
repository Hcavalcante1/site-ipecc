"use client";

import { useState } from "react";
import { supabasePublic as supabase } from "@/lib/supabasePublic";

const TIPOS = [
  { value: "acesso", label: "Acesso — quero saber quais dados vocês têm sobre mim" },
  { value: "exclusao", label: "Exclusão — quero que meus dados sejam apagados" },
  { value: "retificacao", label: "Retificação — quero corrigir dados incorretos" },
  { value: "portabilidade", label: "Portabilidade — quero receber meus dados" },
  { value: "oposicao", label: "Oposição — quero me opor ao tratamento" },
] as const;

const VAZIO = { nome: "", email: "", tipo: "acesso" as const, mensagem: "" };

export default function SolicitacaoLgpdForm() {
  const [form, setForm] = useState<typeof VAZIO>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      setMsg({ texto: "Nome e e-mail são obrigatórios.", ok: false });
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("lgpd_solicitacoes").insert({
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      tipo: form.tipo,
      mensagem: form.mensagem.trim() || null,
    });
    setEnviando(false);
    if (error) {
      setMsg({ texto: `Erro ao enviar: ${error.message}`, ok: false });
    } else {
      setMsg({ texto: "Solicitação recebida. Responderemos em até 15 dias úteis no e-mail informado.", ok: true });
      setForm(VAZIO);
    }
  }

  return (
    <form onSubmit={enviar} style={s.form}>
      <div style={s.row}>
        <label style={s.label}>
          Nome completo *
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Seu nome"
            style={s.input}
            required
          />
        </label>
        <label style={s.label}>
          E-mail *
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="seu@email.com"
            style={s.input}
            required
          />
        </label>
      </div>

      <label style={s.label}>
        Tipo de solicitação *
        <select
          value={form.tipo}
          onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as typeof form.tipo }))}
          style={s.input}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label style={s.label}>
        Detalhes (opcional)
        <textarea
          rows={3}
          value={form.mensagem}
          onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
          placeholder="Informações adicionais que possam ajudar no atendimento..."
          style={{ ...s.input, resize: "vertical" }}
        />
      </label>

      <div style={s.rodape}>
        <button type="submit" style={s.btn} disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar solicitação"}
        </button>
        {msg && (
          <p style={{ ...s.feedback, color: msg.ok ? "#166534" : "#991b1b" }}>
            {msg.texto}
          </p>
        )}
      </div>
    </form>
  );
}

const s: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14 },
  row: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "9px 11px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", background: "#fff" },
  rodape: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 },
  btn: { padding: "10px 22px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  feedback: { fontSize: 13, fontWeight: 600, margin: 0 },
};
