import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Pública — IPECC",
  description: "Documentação da API REST pública do Instituto IPECC. Endpoints para editais, transparência, indicadores e projetos.",
};

type Param = { nome: string; tipo: string; desc: string; obrigatorio?: boolean };
type Endpoint = {
  metodo: "GET";
  path: string;
  desc: string;
  params?: Param[];
  exemplo: object;
};

const BASE = "https://ipecc.org.br/api/v1";

const ENDPOINTS: Endpoint[] = [
  {
    metodo: "GET",
    path: "/api/v1/indicadores",
    desc: "Estatísticas agregadas e ao vivo do Instituto IPECC — editais, propostas, beneficiários e documentos de transparência.",
    exemplo: {
      ok: true,
      data: {
        editais_abertos: 3,
        editais_publicados: 12,
        propostas_recebidas: 47,
        beneficiarios_cadastrados: 1240,
        documentos_transparencia: 28,
        atualizado_em: "2025-08-03T10:00:00.000Z",
      },
    },
  },
  {
    metodo: "GET",
    path: "/api/v1/editais",
    desc: "Lista de editais e chamamentos públicos, excluindo rascunhos. Suporta filtro por status e paginação.",
    params: [
      { nome: "status", tipo: "string", desc: "Filtrar por status: aberto, encerrado, cancelado" },
      { nome: "limit", tipo: "integer", desc: "Máximo de resultados (padrão 20, máx 100)" },
      { nome: "offset", tipo: "integer", desc: "Deslocamento para paginação (padrão 0)" },
    ],
    exemplo: {
      ok: true,
      data: [
        {
          id: "uuid",
          titulo: "Edital de Cultura 2025",
          status: "aberto",
          fase_atual: "Inscrições",
          descricao: "Chamamento público para projetos culturais.",
          created_at: "2025-07-15T00:00:00.000Z",
        },
      ],
      total: 12,
      limit: 20,
      offset: 0,
    },
  },
  {
    metodo: "GET",
    path: "/api/v1/transparencia",
    desc: "Documentos de transparência publicados — convênios e prestação de contas. Combinados e ordenados por data.",
    params: [
      { nome: "tipo", tipo: "string", desc: "Filtrar por tipo: convenios, prestacao" },
      { nome: "limit", tipo: "integer", desc: "Máximo de resultados (padrão 20, máx 100)" },
      { nome: "offset", tipo: "integer", desc: "Deslocamento para paginação (padrão 0)" },
    ],
    exemplo: {
      ok: true,
      data: [
        {
          id: "uuid",
          titulo: "Convênio 001/2025 — Secretaria de Cultura",
          publicado: true,
          created_at: "2025-06-01T00:00:00.000Z",
          tipo: "convenio",
        },
      ],
      total: 28,
      limit: 20,
      offset: 0,
    },
  },
  {
    metodo: "GET",
    path: "/api/v1/projetos",
    desc: "Eixos temáticos e projetos estruturantes do IPECC com título, descrição e imagem.",
    params: [
      { nome: "pagina", tipo: "string", desc: "Slug da página (padrão: projetos)" },
    ],
    exemplo: {
      ok: true,
      data: [
        {
          id: "uuid",
          titulo: "Educação",
          texto: "Projetos de fortalecimento educacional.",
          imagem_url: null,
          ordem: 1,
          bloco: "eixos",
          pagina_slug: "projetos",
        },
      ],
      total: 4,
    },
  },
];

const SNIPPETS: Record<string, (path: string) => string> = {
  curl: (path) => `curl "${BASE}${path.replace("/api/v1", "")}"`,
  js: (path) =>
    `const res = await fetch("${BASE}${path.replace("/api/v1", "")}");\nconst json = await res.json();\nconsole.log(json.data);`,
  python: (path) =>
    `import requests\nr = requests.get("${BASE}${path.replace("/api/v1", "")}")\nprint(r.json()["data"])`,
};

export default function ApiDocsPage() {
  return (
    <div style={s.page}>
      <div style={s.container}>

        <header style={s.header}>
          <div>
            <span style={s.kicker}>REST · JSON · Pública</span>
            <h1 style={s.titulo}>API IPECC</h1>
            <p style={s.sub}>
              Endpoints públicos e somente-leitura para integração com dados do Instituto IPECC.
              Sem autenticação. Limite de <strong>30 requisições/minuto</strong> por IP.
            </p>
          </div>
          <div style={s.baseUrl}>
            <p style={s.baseLabel}>Base URL</p>
            <code style={s.baseCode}>{BASE}</code>
          </div>
        </header>

        <div style={s.infoGrid}>
          <div style={s.infoCard}>
            <strong style={s.infoTitulo}>Formato</strong>
            <p style={s.infoTexto}>Todas as respostas são JSON com campo <code>ok</code>, <code>data</code> e metadados de paginação quando aplicável.</p>
          </div>
          <div style={s.infoCard}>
            <strong style={s.infoTitulo}>CORS</strong>
            <p style={s.infoTexto}>Requisições cross-origin são permitidas de qualquer origem (<code>Access-Control-Allow-Origin: *</code>).</p>
          </div>
          <div style={s.infoCard}>
            <strong style={s.infoTitulo}>Erros</strong>
            <p style={s.infoTexto}>Respostas de erro retornam <code>{"{ ok: false, error: \"mensagem\" }"}</code> com o HTTP status code apropriado.</p>
          </div>
          <div style={s.infoCard}>
            <strong style={s.infoTitulo}>Cache</strong>
            <p style={s.infoTexto}>Respostas podem ser cacheadas por até 60s em CDN (<code>s-maxage=60</code>) com revalidação em background.</p>
          </div>
        </div>

        <section style={s.endpoints}>
          <h2 style={s.secTitulo}>Endpoints</h2>
          {ENDPOINTS.map((ep) => (
            <div key={ep.path} style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.metodo}>{ep.metodo}</span>
                <code style={s.path}>{ep.path}</code>
              </div>
              <p style={s.desc}>{ep.desc}</p>

              {ep.params && ep.params.length > 0 && (
                <div style={s.paramsBlock}>
                  <p style={s.paramsTitle}>Query parameters</p>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Parâmetro</th>
                        <th style={s.th}>Tipo</th>
                        <th style={s.th}>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.params.map((p) => (
                        <tr key={p.nome}>
                          <td style={s.td}><code style={s.paramCode}>{p.nome}</code></td>
                          <td style={s.td}><span style={s.tipo}>{p.tipo}</span></td>
                          <td style={s.td}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={s.snippetsBlock}>
                <p style={s.paramsTitle}>Exemplos de requisição</p>
                <div style={s.snippetTabs}>
                  {Object.entries(SNIPPETS).map(([lang, fn]) => (
                    <div key={lang} style={s.snippetGroup}>
                      <span style={s.snippetLang}>{lang}</span>
                      <pre style={s.pre}>{fn(ep.path)}</pre>
                    </div>
                  ))}
                </div>
              </div>

              <div style={s.exemploBlock}>
                <p style={s.paramsTitle}>Exemplo de resposta</p>
                <pre style={s.pre}>{JSON.stringify(ep.exemplo, null, 2)}</pre>
              </div>
            </div>
          ))}
        </section>

        <section style={s.errosSection}>
          <h2 style={s.secTitulo}>Códigos de resposta</h2>
          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Código</th>
                  <th style={s.th}>Significado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["200 OK", "Requisição bem-sucedida."],
                  ["204 No Content", "Preflight OPTIONS bem-sucedido."],
                  ["400 Bad Request", "Parâmetros inválidos."],
                  ["429 Too Many Requests", "Limite de requisições excedido. Aguarde 1 minuto."],
                  ["500 Internal Server Error", "Erro no servidor. Tente novamente em instantes."],
                ].map(([code, msg]) => (
                  <tr key={code}>
                    <td style={s.td}><code style={s.paramCode}>{code}</code></td>
                    <td style={s.td}>{msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer style={s.footer}>
          <p>
            API do Instituto IPECC · Dados públicos somente-leitura · CNPJ 05.965.225/0001-04
          </p>
          <p style={{ marginTop: 6 }}>
            <Link href="/transparencia" style={s.footerLink}>Transparência</Link>
            {" · "}
            <Link href="/politica-privacidade" style={s.footerLink}>Política de Privacidade</Link>
            {" · "}
            <Link href="/" style={s.footerLink}>Portal IPECC</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { background: "#0b1120", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" },
  container: { maxWidth: 900, margin: "0 auto", padding: "48px 24px 64px" },
  header: { display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 36, paddingBottom: 32, borderBottom: "1px solid rgba(148,163,184,0.15)" },
  kicker: { display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#38bdf8", marginBottom: 10 },
  titulo: { margin: "0 0 10px", fontSize: 32, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.02em" },
  sub: { margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.6, maxWidth: 540 },
  baseUrl: { background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 12, padding: "16px 20px", flexShrink: 0 },
  baseLabel: { margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
  baseCode: { fontSize: 13, color: "#7dd3fc", fontFamily: "monospace" },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 48 },
  infoCard: { background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 10, padding: "14px 16px" },
  infoTitulo: { display: "block", fontSize: 12, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 },
  infoTexto: { margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  endpoints: { marginBottom: 48 },
  secTitulo: { fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "24px 28px", marginBottom: 20 },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  metodo: { background: "#1d4ed8", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 900, letterSpacing: "0.05em", flexShrink: 0 },
  path: { fontSize: 15, color: "#7dd3fc", fontFamily: "monospace", fontWeight: 600 },
  desc: { margin: "0 0 20px", fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  paramsBlock: { marginBottom: 20 },
  snippetsBlock: { marginBottom: 20 },
  exemploBlock: {},
  paramsTitle: { fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 10px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "rgba(30,41,59,0.8)", color: "#64748b", padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  td: { padding: "9px 12px", borderTop: "1px solid rgba(148,163,184,0.08)", color: "#94a3b8", verticalAlign: "top" },
  paramCode: { fontFamily: "monospace", fontSize: 12, color: "#7dd3fc", background: "rgba(14,165,233,0.1)", padding: "1px 5px", borderRadius: 4 },
  tipo: { fontSize: 11, color: "#a78bfa", fontFamily: "monospace" },
  snippetTabs: { display: "flex", flexDirection: "column" as const, gap: 8 },
  snippetGroup: {},
  snippetLang: { display: "block", fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 },
  pre: { margin: 0, padding: "12px 16px", background: "rgba(2,6,23,0.8)", borderRadius: 8, fontSize: 12, color: "#a5f3fc", fontFamily: "monospace", overflowX: "auto" as const, lineHeight: 1.6, border: "1px solid rgba(148,163,184,0.1)" },
  errosSection: { marginBottom: 48 },
  footer: { paddingTop: 24, borderTop: "1px solid rgba(148,163,184,0.12)", fontSize: 12, color: "#475569", textAlign: "center" as const },
  footerLink: { color: "#38bdf8", textDecoration: "none" },
};
