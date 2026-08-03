import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabasePublic as supabase } from "@/lib/supabasePublic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal do Financiador — IPECC",
  robots: { index: false, follow: false },
};

type Edital = {
  id: string;
  titulo: string | null;
  status: string | null;
  fase_atual: string | null;
  created_at: string;
};

type DocTransparencia = {
  id: string;
  titulo: string | null;
  publicado: boolean | null;
  created_at: string;
  tipo?: string;
};

export default async function PortalFinanciadorPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  // Valida token via função SECURITY DEFINER (acessível ao anon)
  const { data: validacao } = await supabase.rpc("validar_portal_token", {
    p_token: token,
  });

  const resultado = (validacao as Array<{ label: string; descricao: string | null; valido: boolean }> | null)?.[0];

  if (!resultado?.valido) {
    notFound();
  }

  // Busca dados públicos para exibir
  const [
    { data: editais },
    { data: convenios },
    { data: prestacao },
    { count: totalPropostas },
  ] = await Promise.all([
    supabase
      .from("editais")
      .select("id, titulo, status, fase_atual, created_at")
      .neq("status", "rascunho")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("transparencia_convenios")
      .select("id, titulo, publicado, created_at")
      .eq("publicado", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("transparencia_prestacao_contas")
      .select("id, titulo, publicado, created_at")
      .eq("publicado", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("propostas")
      .select("id", { count: "exact", head: true }),
  ]);

  const editaisLista = (editais ?? []) as Edital[];
  const conveniosLista = ((convenios ?? []) as DocTransparencia[]).map((d) => ({ ...d, tipo: "Convênio" }));
  const prestacaoLista = ((prestacao ?? []) as DocTransparencia[]).map((d) => ({ ...d, tipo: "Prestação de Contas" }));
  const transparenciaDocs = [...conveniosLista, ...prestacaoLista].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const agora = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div style={p.page}>
      <div style={p.printBar}>
        <button style={p.printBtn} onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>

      <header style={p.header}>
        <div style={p.headerBrand}>IPECC</div>
        <div>
          <h1 style={p.headerTitulo}>Portal do Financiador</h1>
          <p style={p.headerSub}>{resultado.label}</p>
          {resultado.descricao && <p style={p.headerDesc}>{resultado.descricao}</p>}
        </div>
        <div style={p.headerData}>Emitido em {agora}</div>
      </header>

      <div style={p.content}>

        {/* Resumo operacional */}
        <section style={p.section}>
          <h2 style={p.sectionTitulo}>Resumo Operacional</h2>
          <div style={p.statsGrid}>
            <div style={p.stat}>
              <strong style={p.statValor}>{editaisLista.filter((e) => e.status === "aberto").length}</strong>
              <span style={p.statLabel}>Editais abertos</span>
            </div>
            <div style={p.stat}>
              <strong style={p.statValor}>{editaisLista.length}</strong>
              <span style={p.statLabel}>Editais publicados</span>
            </div>
            <div style={p.stat}>
              <strong style={p.statValor}>{totalPropostas ?? 0}</strong>
              <span style={p.statLabel}>Propostas recebidas</span>
            </div>
            <div style={p.stat}>
              <strong style={p.statValor}>{transparenciaDocs.length}</strong>
              <span style={p.statLabel}>Docs de transparência</span>
            </div>
          </div>
        </section>

        {/* Editais */}
        {editaisLista.length > 0 && (
          <section style={p.section}>
            <h2 style={p.sectionTitulo}>Editais e Processos</h2>
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead>
                  <tr>
                    <th style={p.th}>Edital</th>
                    <th style={p.th}>Status</th>
                    <th style={p.th}>Fase atual</th>
                    <th style={p.th}>Publicado em</th>
                  </tr>
                </thead>
                <tbody>
                  {editaisLista.map((e, i) => (
                    <tr key={e.id} style={i % 2 ? p.trAlt : p.tr}>
                      <td style={p.td}>{e.titulo || "—"}</td>
                      <td style={p.td}>
                        <span style={{ ...p.badge, ...(e.status === "aberto" ? p.badgeAtivo : p.badgeNeutro) }}>
                          {e.status ?? "—"}
                        </span>
                      </td>
                      <td style={p.td}>{e.fase_atual || "—"}</td>
                      <td style={{ ...p.td, whiteSpace: "nowrap" }}>
                        {new Date(e.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Transparência */}
        {transparenciaDocs.length > 0 && (
          <section style={p.section}>
            <h2 style={p.sectionTitulo}>Transparência e Prestação de Contas</h2>
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead>
                  <tr>
                    <th style={p.th}>Documento</th>
                    <th style={p.th}>Tipo</th>
                    <th style={p.th}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transparenciaDocs.map((d, i) => (
                    <tr key={d.id} style={i % 2 ? p.trAlt : p.tr}>
                      <td style={p.td}>{d.titulo || "—"}</td>
                      <td style={p.td}>{d.tipo}</td>
                      <td style={{ ...p.td, whiteSpace: "nowrap" }}>
                        {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer style={p.footer}>
          <p>Instituto IPECC · portal.ipecc.org.br · Documento gerado em {agora}</p>
          <p style={{ marginTop: 4 }}>
            Este link é de uso exclusivo do parceiro indicado. Não compartilhe.
          </p>
        </footer>
      </div>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" },
  printBar: { background: "#1e293b", padding: "10px 24px", display: "flex", justifyContent: "flex-end" },
  printBtn: { padding: "7px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  header: { background: "#0f172a", color: "#f1f5f9", padding: "28px 32px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" },
  headerBrand: { fontSize: 28, fontWeight: 900, color: "#38bdf8", letterSpacing: "-0.03em", flexShrink: 0 },
  headerTitulo: { margin: 0, fontSize: 20, fontWeight: 800 },
  headerSub: { margin: "4px 0 0", color: "#7dd3fc", fontSize: 14, fontWeight: 600 },
  headerDesc: { margin: "4px 0 0", color: "#94a3b8", fontSize: 12 },
  headerData: { fontSize: 12, color: "#64748b", flexShrink: 0 },
  content: { maxWidth: 920, margin: "0 auto", padding: "32px 24px" },
  section: { marginBottom: 36 },
  sectionTitulo: { margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "2px solid #e2e8f0", paddingBottom: 8 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 },
  stat: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statValor: { fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748b" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#0f172a" },
  th: { background: "#1e293b", color: "#fff", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase" },
  tr: { background: "#fff" },
  trAlt: { background: "#f8fafc" },
  td: { padding: "10px 12px", borderTop: "1px solid #e2e8f0", verticalAlign: "top" },
  badge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, border: "1px solid" },
  badgeAtivo: { color: "#166534", background: "#dcfce7", borderColor: "#bbf7d0" },
  badgeNeutro: { color: "#475569", background: "#f1f5f9", borderColor: "#cbd5e1" },
  footer: { marginTop: 48, paddingTop: 16, borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", textAlign: "center" },
};
