"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";

type Status = "ativo" | "inativo" | "suspenso";

type Beneficiario = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  programa: string | null;
  municipio: string | null;
  uf: string | null;
  data_entrada: string | null;
  data_nascimento: string | null;
  status: Status;
  observacoes: string | null;
  created_at: string;
};

const VAZIO: Omit<Beneficiario, "id" | "created_at"> = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  programa: "",
  municipio: "",
  uf: "",
  data_entrada: new Date().toISOString().slice(0, 10),
  data_nascimento: "",
  status: "ativo",
  observacoes: "",
};

const STATUS_ESTILO: Record<Status, React.CSSProperties> = {
  ativo:    { background: "rgba(22,101,52,0.28)",   color: "#86efac", border: "1px solid #166534" },
  inativo:  { background: "rgba(100,116,139,0.18)", color: "#94a3b8", border: "1px solid #334155" },
  suspenso: { background: "rgba(127,29,29,0.28)",   color: "#fca5a5", border: "1px solid #7f1d1d" },
};

const POR_PAGINA = 50;

export default function BeneficiariosPage() {
  const [lista, setLista]             = useState<Beneficiario[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);

  // Filtros
  const [busca, setBusca]             = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUF, setFiltroUF]       = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaReal                     = useRef("");

  // Stats
  const [stats, setStats] = useState({ total: 0, ativo: 0, inativo: 0, suspenso: 0 });

  // Form / modal
  const [mostrarForm, setMostrarForm]   = useState(false);
  const [editandoId, setEditandoId]     = useState<string | null>(null);
  const [form, setForm]                 = useState({ ...VAZIO });
  const [salvando, setSalvando]         = useState(false);
  const [msg, setMsg]                   = useState("");

  // Import CSV
  const [mostrarImport, setMostrarImport] = useState(false);
  const [csvTexto, setCsvTexto]           = useState("");
  const [importando, setImportando]       = useState(false);
  const [importMsg, setImportMsg]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const hoje = new Date().toISOString().slice(0, 10);

  function buildQuery(offset = 0) {
    let q = supabase
      .from("beneficiarios")
      .select("*", { count: "exact" })
      .order("nome", { ascending: true })
      .range(offset, offset + POR_PAGINA - 1);

    if (filtroStatus)            q = q.eq("status", filtroStatus);
    if (filtroUF.trim())         q = q.ilike("uf", filtroUF.trim());
    if (filtroPrograma.trim())   q = q.ilike("programa", `%${filtroPrograma.trim()}%`);
    if (buscaReal.current.trim()) {
      q = q.or(`nome.ilike.%${buscaReal.current.trim()}%,cpf.ilike.%${buscaReal.current.trim()}%,email.ilike.%${buscaReal.current.trim()}%`);
    }
    return q;
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, count } = await buildQuery(0);
    setLista((data ?? []) as Beneficiario[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [filtroStatus, filtroUF, filtroPrograma]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarMais() {
    setLoadingMais(true);
    const { data } = await buildQuery(lista.length);
    if (data) setLista((prev) => [...prev, ...(data as Beneficiario[])]);
    setLoadingMais(false);
  }

  async function carregarStats() {
    const { data } = await supabase
      .from("beneficiarios")
      .select("status");
    const s = { total: 0, ativo: 0, inativo: 0, suspenso: 0 };
    for (const r of (data ?? []) as { status: Status }[]) {
      s.total++;
      s[r.status] = (s[r.status] ?? 0) + 1;
    }
    setStats(s);
  }

  function handleBusca(v: string) {
    setBusca(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscaReal.current = v;
      void carregar();
    }, 400);
  }

  useEffect(() => { void carregar(); void carregarStats(); }, [carregar]);

  function abrirNovo() {
    setForm({ ...VAZIO });
    setEditandoId(null);
    setMsg("");
    setMostrarForm(true);
  }

  function abrirEdicao(b: Beneficiario) {
    setForm({
      nome:           b.nome,
      cpf:            b.cpf ?? "",
      email:          b.email ?? "",
      telefone:       b.telefone ?? "",
      programa:       b.programa ?? "",
      municipio:      b.municipio ?? "",
      uf:             b.uf ?? "",
      data_entrada:   b.data_entrada ?? hoje,
      data_nascimento: b.data_nascimento ?? "",
      status:         b.status,
      observacoes:    b.observacoes ?? "",
    });
    setEditandoId(b.id);
    setMsg("");
    setMostrarForm(true);
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg("Nome é obrigatório."); return; }
    setSalvando(true);
    setMsg("Salvando...");

    const payload = {
      nome:            form.nome.trim(),
      cpf:             form.cpf?.trim() || null,
      email:           form.email?.trim() || null,
      telefone:        form.telefone?.trim() || null,
      programa:        form.programa?.trim() || null,
      municipio:       form.municipio?.trim() || null,
      uf:              form.uf?.trim().toUpperCase().slice(0, 2) || null,
      data_entrada:    form.data_entrada || null,
      data_nascimento: form.data_nascimento || null,
      status:          form.status,
      observacoes:     form.observacoes?.trim() || null,
    };

    const { error } = editandoId
      ? await supabase.from("beneficiarios").update(payload).eq("id", editandoId)
      : await supabase.from("beneficiarios").insert(payload);

    setSalvando(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg(editandoId ? "Atualizado." : "Cadastrado.");
      setMostrarForm(false);
      setEditandoId(null);
      void carregar();
      void carregarStats();
    }
  }

  async function alterarStatus(id: string, novoStatus: Status) {
    await supabase.from("beneficiarios").update({ status: novoStatus }).eq("id", id);
    void carregar();
    void carregarStats();
  }

  async function excluir(id: string, nome: string) {
    const ok = await confirmAction(`Excluir "${nome}"? Esta ação não pode ser desfeita.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Excluir "${nome}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    const { error } = await supabase.from("beneficiarios").delete().eq("id", id);
    if (error) {
      triggerToast(`Erro ao excluir: ${error.message}`, "error");
      return;
    }
    triggerToast(`"${nome}" excluído.`, "success");
    void carregar();
    void carregarStats();
  }

  function exportarCSV() {
    if (lista.length === 0) return;
    const cab = ["Nome", "CPF", "E-mail", "Telefone", "Programa", "Município", "UF", "Status", "Data nascimento", "Data entrada", "Observações"];
    const linhas = lista.map((b) => [
      b.nome, b.cpf ?? "", b.email ?? "", b.telefone ?? "",
      b.programa ?? "", b.municipio ?? "", b.uf ?? "", b.status,
      b.data_nascimento ?? "", b.data_entrada ?? "", b.observacoes ?? "",
    ]);
    const csv = "﻿" + [cab, ...linhas].map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `beneficiarios-${hoje}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function processarImport() {
    if (!csvTexto.trim()) { setImportMsg("Cole o CSV no campo acima."); return; }
    setImportando(true);
    setImportMsg("Processando...");

    const linhas = csvTexto.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linhas.length < 2) { setImportMsg("CSV precisa de cabeçalho + ao menos 1 linha."); setImportando(false); return; }

    const cabecalho = linhas[0].split(",").map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
    const idx = (col: string) => cabecalho.indexOf(col);

    function cell(row: string[], col: string): string {
      const i = idx(col);
      if (i < 0) return "";
      const v = row[i] ?? "";
      return v.trim().replace(/^"|"$/g, "");
    }

    const registros = linhas.slice(1).map((linha) => {
      const cols = linha.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? [];
      return {
        nome:            cell(cols, "nome"),
        cpf:             cell(cols, "cpf") || null,
        email:           cell(cols, "e-mail") || cell(cols, "email") || null,
        telefone:        cell(cols, "telefone") || null,
        programa:        cell(cols, "programa") || null,
        municipio:       cell(cols, "município") || cell(cols, "municipio") || null,
        uf:              (cell(cols, "uf") || "").toUpperCase().slice(0, 2) || null,
        data_nascimento: cell(cols, "data nascimento") || cell(cols, "data_nascimento") || null,
        data_entrada:    cell(cols, "data entrada") || cell(cols, "data_entrada") || null,
        status:          (cell(cols, "status") as Status) || "ativo",
        observacoes:     cell(cols, "observações") || cell(cols, "observacoes") || null,
      };
    }).filter((r) => r.nome);

    if (registros.length === 0) { setImportMsg("Nenhum registro válido encontrado (nome obrigatório)."); setImportando(false); return; }

    const { error } = await supabase.from("beneficiarios").insert(registros);
    setImportando(false);
    if (error) {
      setImportMsg(`Erro: ${error.message}`);
    } else {
      setImportMsg(`${registros.length} beneficiário(s) importado(s) com sucesso.`);
      setCsvTexto("");
      void carregar();
      void carregarStats();
    }
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvTexto(ev.target?.result as string ?? "");
    reader.readAsText(file, "utf-8");
  }

  const programas = Array.from(new Set(lista.map((b) => b.programa).filter(Boolean)));

  return (
    <div style={s.wrap}>
      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Beneficiários</h1>
          <p style={s.sub}>Cadastro e gestão de beneficiários dos programas institucionais.</p>
        </div>
        <div style={s.headerAcoes}>
          <button style={s.btnSecundario} onClick={() => setMostrarImport((v) => !v)}>
            ↑ Importar CSV
          </button>
          <button style={s.btnPrimario} onClick={abrirNovo}>
            + Novo beneficiário
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {([
          { label: "Total",     valor: stats.total,    cor: "#93c5fd" },
          { label: "Ativos",    valor: stats.ativo,    cor: "#86efac" },
          { label: "Inativos",  valor: stats.inativo,  cor: "#94a3b8" },
          { label: "Suspensos", valor: stats.suspenso, cor: "#fca5a5" },
        ] as const).map((st) => (
          <div key={st.label} style={s.statCard}>
            <span style={{ ...s.statNum, color: st.cor }}>{st.valor}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
        <button
          style={{ ...s.statCard, cursor: "pointer", border: "1px solid rgba(148,163,184,0.2)", justifyContent: "center" }}
          onClick={exportarCSV}
          disabled={lista.length === 0}
          title="Exportar lista atual como CSV"
        >
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>⬇ CSV ({lista.length})</span>
        </button>
      </div>

      {/* Import CSV */}
      {mostrarImport && (
        <div style={s.importCard}>
          <div style={s.importTitulo}>Importar beneficiários via CSV</div>
          <p style={s.importDica}>
            Cabeçalho esperado (em qualquer ordem):{" "}
            <code style={s.code}>nome, cpf, e-mail, telefone, programa, municipio, uf, status, data_nascimento, data_entrada, observacoes</code>
            <br />Apenas <strong>nome</strong> é obrigatório. Status padrão: <em>ativo</em>.
          </p>
          <div style={s.importRow}>
            <button type="button" style={s.btnFile} onClick={() => fileRef.current?.click()}>
              Selecionar arquivo .csv
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleArquivo} />
            <span style={s.importOu}>ou cole abaixo</span>
          </div>
          <textarea
            style={s.textarea}
            rows={6}
            placeholder={"nome,cpf,e-mail,telefone,programa,municipio,uf\nMaria Silva,123.456.789-00,maria@email.com,11999999999,Programa A,São Paulo,SP"}
            value={csvTexto}
            onChange={(e) => setCsvTexto(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={s.btnPrimario} onClick={() => void processarImport()} disabled={importando}>
              {importando ? "Importando..." : "Importar"}
            </button>
            <button style={s.btnSecundario} onClick={() => { setMostrarImport(false); setCsvTexto(""); setImportMsg(""); }}>
              Cancelar
            </button>
            {importMsg && <span style={{ fontSize: 13, color: importMsg.startsWith("Erro") ? "#fca5a5" : "#86efac" }}>{importMsg}</span>}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={s.filtrosCard}>
        <div style={s.filtrosGrid}>
          <input
            placeholder="Buscar nome, CPF ou e-mail..."
            value={busca}
            onChange={(e) => handleBusca(e.target.value)}
            style={{ ...s.input, flex: "2 1 200px" }}
          />
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={s.select}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="suspenso">Suspensos</option>
          </select>
          <select value={filtroUF} onChange={(e) => setFiltroUF(e.target.value)} style={s.select}>
            <option value="">Todos os estados</option>
            {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {programas.length > 0 && (
            <select value={filtroPrograma} onChange={(e) => setFiltroPrograma(e.target.value)} style={s.select}>
              <option value="">Todos os programas</option>
              {programas.map((p) => <option key={p} value={p!}>{p}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Modal de cadastro/edição */}
      {mostrarForm && (
        <div style={s.overlay} onClick={() => setMostrarForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>{editandoId ? "Editar beneficiário" : "Novo beneficiário"}</h2>
              <button type="button" style={s.modalClose} onClick={() => setMostrarForm(false)}>✕</button>
            </div>

            <div className="admin-grid-2" style={{ marginBottom: 20 }}>
              <label style={s.label}>
                Nome *
                <input style={s.inputForm} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
              </label>
              <label style={s.label}>
                CPF
                <input style={s.inputForm} value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
              </label>
              <label style={s.label}>
                E-mail
                <input style={s.inputForm} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </label>
              <label style={s.label}>
                Telefone
                <input style={s.inputForm} value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
              </label>
              <label style={s.label}>
                Programa
                <input style={s.inputForm} value={form.programa ?? ""} onChange={(e) => setForm({ ...form, programa: e.target.value })} placeholder="Nome do programa" />
              </label>
              <label style={s.label}>
                Município
                <input style={s.inputForm} value={form.municipio ?? ""} onChange={(e) => setForm({ ...form, municipio: e.target.value })} placeholder="São Paulo" />
              </label>
              <label style={s.label}>
                UF
                <select style={s.inputForm} value={form.uf ?? ""} onChange={(e) => setForm({ ...form, uf: e.target.value })}>
                  <option value="">—</option>
                  {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Status
                <select style={s.inputForm} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="suspenso">Suspenso</option>
                </select>
              </label>
              <label style={s.label}>
                Data de nascimento
                <input style={s.inputForm} type="date" value={form.data_nascimento ?? ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} max={hoje} />
              </label>
              <label style={s.label}>
                Data de entrada
                <input style={s.inputForm} type="date" value={form.data_entrada ?? ""} onChange={(e) => setForm({ ...form, data_entrada: e.target.value })} max={hoje} />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Observações
                <textarea style={{ ...s.inputForm, minHeight: 70, resize: "vertical" }} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações complementares..." />
              </label>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecundario} onClick={() => setMostrarForm(false)}>Cancelar</button>
              <button style={s.btnPrimario} onClick={() => void salvar()} disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar"}
              </button>
              {msg && <span style={{ fontSize: 13, color: msg.startsWith("Erro") ? "#fca5a5" : "#86efac" }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p style={s.empty}>Nenhum beneficiário encontrado com os filtros atuais.</p>
      ) : (
        <>
          <p style={s.totalLabel}>{total} beneficiário{total !== 1 ? "s" : ""} — exibindo {lista.length}</p>

          <div className="admin-table-grid-wrap" style={s.tabela}>
            <div style={{ ...s.tabelaHeader, minWidth: 620 }}>
              <span>Nome / CPF</span>
              <span>Programa</span>
              <span>Município / UF</span>
              <span>Status</span>
              <span>Entrada</span>
              <span style={{ textAlign: "right" }}>Ações</span>
            </div>
            {lista.map((b) => (
              <div key={b.id} style={{ ...s.tabelaRow, minWidth: 620 }}>
                <div>
                  <div style={s.bNome}>{b.nome}</div>
                  {b.cpf && <div style={s.bSub}>{b.cpf}</div>}
                  {b.email && <div style={s.bSub}>{b.email}</div>}
                </div>
                <div style={s.bSub}>{b.programa ?? "—"}</div>
                <div style={s.bSub}>{[b.municipio, b.uf].filter(Boolean).join(" / ") || "—"}</div>
                <div>
                  <span style={{ ...s.statusChip, ...STATUS_ESTILO[b.status] }}>
                    {b.status}
                  </span>
                </div>
                <div style={s.bSub}>
                  {b.data_entrada ? new Date(b.data_entrada + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                </div>
                <div style={s.acoesCell}>
                  <button style={s.btnAcao} onClick={() => abrirEdicao(b)} title="Editar">✏</button>
                  {b.status !== "ativo" && (
                    <button style={{ ...s.btnAcao, color: "#86efac" }} onClick={() => void alterarStatus(b.id, "ativo")} title="Reativar">✓</button>
                  )}
                  {b.status === "ativo" && (
                    <button style={{ ...s.btnAcao, color: "#fde047" }} onClick={() => void alterarStatus(b.id, "inativo")} title="Inativar">⊘</button>
                  )}
                  <button style={{ ...s.btnAcao, color: "#fca5a5" }} onClick={() => void excluir(b.id, b.nome)} title="Excluir">🗑</button>
                </div>
              </div>
            ))}
          </div>

          {lista.length < total && (
            <button
              style={s.btnMais}
              type="button"
              onClick={() => void carregarMais()}
              disabled={loadingMais}
            >
              {loadingMais ? "Carregando..." : `Carregar mais (${total - lista.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  headerAcoes:  { display: "flex", gap: 8 },
  btnPrimario:  { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnSecundario:{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  statsRow:     { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  statCard:     { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 2, minWidth: 100 },
  statNum:      { fontSize: 28, fontWeight: 900, lineHeight: 1 },
  statLabel:    { fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  importCard:   { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 16 },
  importTitulo: { fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 },
  importDica:   { fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 12 },
  importRow:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  importOu:     { fontSize: 12, color: "#334155" },
  btnFile:      { padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  code:         { fontFamily: "monospace", fontSize: 11, background: "rgba(2,6,23,0.6)", padding: "2px 6px", borderRadius: 4 },
  textarea:     { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", marginBottom: 12 },
  filtrosCard:  { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 14, padding: "14px 18px", marginBottom: 16 },
  filtrosGrid:  { display: "flex", gap: 10, flexWrap: "wrap" },
  input:        { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  select:       { flex: "1 1 140px", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal:        { background: "#0f172a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 18, padding: "24px 28px", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitulo:  { margin: 0, fontSize: 17, fontWeight: 800, color: "#f1f5f9" },
  modalClose:   { background: "transparent", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1 },
  label:        { fontSize: 12, fontWeight: 600, color: "#64748b", display: "flex", flexDirection: "column", gap: 5 },
  inputForm:    { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  modalFooter:  { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  totalLabel:   { fontSize: 12, color: "#475569", marginBottom: 10 },
  tabela:       { background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14 },
  tabelaHeader: { display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 0.8fr 0.8fr", gap: 12, padding: "10px 16px", background: "rgba(2,6,23,0.6)", fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  tabelaRow:    { display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 0.8fr 0.8fr", gap: 12, padding: "12px 16px", borderTop: "1px solid rgba(148,163,184,0.08)", alignItems: "center" },
  bNome:        { fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  bSub:         { fontSize: 11, color: "#64748b", marginTop: 2 },
  statusChip:   { padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, display: "inline-flex" },
  acoesCell:    { display: "flex", gap: 4, justifyContent: "flex-end" },
  btnAcao:      { background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: "3px 5px", borderRadius: 6 },
  empty:        { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
  btnMais:      { display: "block", width: "100%", marginTop: 14, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "center" as const },
};
