import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabasePublic as supabase } from "@/lib/supabasePublic";

export const dynamic = "force-dynamic";

type OrgConfig = {
  cnpj?: string;
  email_contato?: string;
  site?: string;
  descricao?: string;
  municipio?: string;
  estado?: string;
  theme_cor_primaria?: string;
  theme_cor_acento?: string;
  theme_bg_header?: string;
};

type Org = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  plano: string;
  config: OrgConfig;
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from("organizacoes")
    .select("nome, config")
    .eq("slug", params.slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) return { title: "Organização não encontrada" };
  const c = (data.config ?? {}) as OrgConfig;
  return {
    title: `${data.nome} — Portal`,
    description: c.descricao ?? `Portal público de ${data.nome}.`,
    robots: { index: false, follow: false },
  };
}

export default async function OrgPortalPage({ params }: { params: { slug: string } }) {
  const { data: org } = await supabase
    .from("organizacoes")
    .select("id, nome, slug, logo_url, plano, config")
    .eq("slug", params.slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!org) notFound();

  const o = org as Org;
  const c = o.config ?? {};
  const corPrimaria = c.theme_cor_primaria ?? "#1d4ed8";
  const corAcento   = c.theme_cor_acento   ?? "#38bdf8";
  const bgHeader    = c.theme_bg_header    ?? "#0f172a";

  const [
    { data: editais, count: totalEditais },
    { data: transparencia },
    { count: totalPropostas },
  ] = await Promise.all([
    supabase
      .from("editais")
      .select("id, titulo, status, fase_atual, created_at", { count: "exact" })
      .eq("org_id", o.id)
      .neq("status", "rascunho")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("transparencia_convenios")
      .select("id, titulo, created_at")
      .eq("publicado", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("propostas")
      .select("id", { count: "exact", head: true })
      .eq("org_id", o.id),
  ]);

  const editaisLista = editais ?? [];
  const editaisAbertos = editaisLista.filter((e) => e.status === "aberto").length;

  const cssVars = `
    :root {
      --org-primaria: ${corPrimaria};
      --org-acento: ${corAcento};
      --org-header-bg: ${bgHeader};
    }
  `;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <style>{cssVars}</style>

      {/* Header branded */}
      <header style={{ background: bgHeader, padding: "20px 32px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
        {o.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.logo_url} alt={o.nome} style={{ height: 40, objectFit: "contain" }} />
        )}
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: corAcento }}>{o.nome}</div>
          {c.descricao && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{c.descricao}</div>}
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" as const }}>
          {c.municipio && <div style={{ fontSize: 12, color: "#64748b" }}>{c.municipio}{c.estado ? ` — ${c.estado}` : ""}</div>}
          {c.email_contato && <div style={{ fontSize: 12, color: "#64748b" }}>{c.email_contato}</div>}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 36 }}>
          {[
            { label: "Editais abertos", valor: editaisAbertos },
            { label: "Editais publicados", valor: totalEditais ?? 0 },
            { label: "Propostas recebidas", valor: totalPropostas ?? 0 },
            { label: "Documentos publicados", valor: (transparencia ?? []).length },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: corPrimaria, lineHeight: 1 }}>{stat.valor}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Editais */}
        {editaisLista.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "2px solid #e2e8f0", paddingBottom: 8 }}>
              Editais e chamamentos
            </h2>
            <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Edital", "Status", "Fase", "Data"].map((h) => (
                      <th key={h} style={{ background: bgHeader, color: "#f1f5f9", padding: "10px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editaisLista.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0" }}>{e.titulo || "—"}</td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0" }}>
                        <span style={{
                          display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                          background: e.status === "aberto" ? "#dcfce7" : "#f1f5f9",
                          color: e.status === "aberto" ? "#166534" : "#475569",
                          border: `1px solid ${e.status === "aberto" ? "#bbf7d0" : "#cbd5e1"}`,
                        }}>
                          {e.status ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", color: "#475569" }}>{e.fase_atual || "—"}</td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", whiteSpace: "nowrap" as const, color: "#64748b" }}>
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
        {(transparencia ?? []).length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#0f172a", borderBottom: "2px solid #e2e8f0", paddingBottom: 8 }}>
              Transparência
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {(transparencia ?? []).map((d) => (
                <div key={d.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{d.titulo || "—"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer style={{ paddingTop: 24, borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", textAlign: "center" as const }}>
          <p>{o.nome}{c.cnpj ? ` · CNPJ ${c.cnpj}` : ""}{c.site ? ` · ${c.site}` : ""}</p>
          <p style={{ marginTop: 4 }}>Portal gerado pela plataforma IPECC · Dados ao vivo</p>
        </footer>
      </div>
    </div>
  );
}
