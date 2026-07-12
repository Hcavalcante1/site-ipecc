"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { triggerToast } from "@/components/AdminToast";

type Processo = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  resumo?: string | null;
  created_at?: string;
};

const TIPOS = [
  { value: "interno_ipecc", label: "Interno IPECC" },
  { value: "publico_externo", label: "Contratação pública externa" },
  { value: "privado_externo", label: "Contratacao privada externa" },
] as const;

export default function AdminProcessosPage() {
  const [lista, setLista] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("interno_ipecc");
  const [resumo, setResumo] = useState("");
  const [msg, setMsg] = useState("");

  async function carregar() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/processos", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Erro ao carregar processos.");
        setLista([]);
      } else {
        setLista((json.processos || []) as Processo[]);
      }
    } catch {
      setMsg("Falha de rede ao carregar processos.");
      setLista([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (!titulo.trim()) {
      triggerToast("Informe o titulo do processo.", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/processos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "criar",
          titulo: titulo.trim(),
          tipo,
          resumo: resumo.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        triggerToast(json.error || "Erro ao criar.", "error");
        setSalvando(false);
        return;
      }
      setTitulo("");
      setResumo("");
      triggerToast("Processo criado.", "success");
      await carregar();
    } catch {
      triggerToast("Falha de rede ao criar processo.", "error");
    }
    setSalvando(false);
  }

  async function encerrar(id: string) {
    try {
      const res = await fetch("/api/admin/processos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "encerrar", id }),
      });
      const json = await res.json();
      if (!res.ok) {
        triggerToast(json.error || "Erro ao encerrar.", "error");
        return;
      }
      triggerToast("Processo encerrado.", "success");
      carregar();
    } catch {
      triggerToast("Falha de rede ao encerrar.", "error");
    }
  }

  return (
    <div className="admin-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="admin-h1">Processos</h1>
          <p style={{ marginTop: 8, maxWidth: 720 }}>
            Pasta de organizacao e permissao (parceiros/operadores). Conteudo
            publicado continua nas paginas publicas ja existentes do site.
          </p>
        </div>
        <Link className="admin-button" href="/admin/acessos">
          Gerenciar acessos
        </Link>
      </div>

      {msg && (
        <div className="admin-card" style={{ marginTop: 16, border: "1px solid #f59e0b" }}>
          <strong>Aviso:</strong> {msg}
        </div>
      )}

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Novo processo</h2>
        <label>Titulo</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Cultura Viva 2026"
        />
        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label>Resumo (opcional)</label>
        <textarea
          rows={3}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
        />
        <button
          type="button"
          className="admin-button"
          disabled={salvando}
          onClick={criar}
          style={{ marginTop: 12 }}
        >
          {salvando ? "Salvando..." : "Criar processo"}
        </button>
      </section>

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2 className="admin-h2">Lista</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : lista.length === 0 ? (
          <p>Nenhum processo cadastrado.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {lista.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <strong>{p.titulo}</strong>
                <p style={{ margin: "8px 0 0" }}>
                  Tipo: {p.tipo} · Status: {p.status}
                </p>
                {p.resumo ? <p style={{ marginTop: 6 }}>{p.resumo}</p> : null}
                {p.status === "ativo" ? (
                  <button
                    type="button"
                    className="admin-button"
                    style={{ marginTop: 10, background: "#b45309" }}
                    onClick={() => encerrar(p.id)}
                  >
                    Encerrar
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
