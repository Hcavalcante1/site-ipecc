"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { labelAcaoAdmin } from "@/lib/admin/acaoLabel";
import {
  editalAceitaEnvioProposta,
  editalVisivelNoSitePublico,
} from "@/lib/editais/governancaRules";
import type { AdminModulo } from "@/lib/auth/adminEscopo";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { carregarProcessosDoEscopo } from "@/lib/auth/processosEscopoCliente";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

type Props = {
  userEmail: string;
};

type AdminLog = {
  id?: string;
  acao?: string;
  tabela?: string;
  user_email?: string;
  created_at?: string;
};

type EditalResumo = {
  status?: string | null;
  fase_atual?: string | null;
};

function podeModuloCliente(
  mestre: boolean,
  modulos: AdminModulo[],
  modulo: AdminModulo
): boolean {
  if (mestre) return true;
  return modulos.includes(modulo);
}

export default function AdminDashboardClient({ userEmail }: Props) {
  const escopo = useAdminEscopoCliente();
  const [totalPropostas, setTotalPropostas] = useState(0);
  const [editaisAtivos, setEditaisAtivos] = useState(0);
  const [noticiasPublicadas, setNoticiasPublicadas] = useState(0);
  const [eventosPublicados, setEventosPublicados] = useState(0);
  const [rascunhosTransparencia, setRascunhosTransparencia] = useState(0);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");
  const [sincronizadoEm, setSincronizadoEm] = useState("-");
  const [titulosProcesso, setTitulosProcesso] = useState<string[]>([]);

  const pode = useCallback(
    (modulo: AdminModulo) =>
      podeModuloCliente(escopo.mestre, escopo.modulos, modulo),
    [escopo.mestre, escopo.modulos]
  );

  const podeVerLogs = escopo.mestre || pode("logs");

  const rotuloEscopo = useMemo(() => {
    if (escopo.loading) return "Carregando escopo...";
    if (escopo.mestre) return "Visao geral IPECC (mestre)";
    if (titulosProcesso.length === 0) return "Escopo do processo";
    if (titulosProcesso.length === 1) return titulosProcesso[0];
    return titulosProcesso.join(" · ");
  }, [escopo.loading, escopo.mestre, titulosProcesso]);

  useEffect(() => {
    if (escopo.loading) return;

    let ativo = true;
    void (async () => {
      const lista = await carregarProcessosDoEscopo();
      if (!ativo) return;
      setTitulosProcesso(lista.map((p) => p.titulo).filter(Boolean));
    })();

    return () => {
      ativo = false;
    };
  }, [escopo.loading, escopo.processoIds]);

  const loadData = useCallback(async () => {
    if (escopo.loading) return;

    const temPropostas = podeModuloCliente(
      escopo.mestre,
      escopo.modulos,
      "propostas"
    );
    const temEditais = podeModuloCliente(
      escopo.mestre,
      escopo.modulos,
      "editais"
    );
    const temNoticias = podeModuloCliente(
      escopo.mestre,
      escopo.modulos,
      "noticias"
    );
    const temEventos = podeModuloCliente(
      escopo.mestre,
      escopo.modulos,
      "eventos"
    );
    const temTransparencia = podeModuloCliente(
      escopo.mestre,
      escopo.modulos,
      "transparencia"
    );
    const temLogs =
      escopo.mestre ||
      podeModuloCliente(escopo.mestre, escopo.modulos, "logs");

    if (temPropostas) {
      // Mesma base da listagem /admin/propostas (com escopo de processo).
      const { data: propostasData } = await supabase
        .from("propostas")
        .select("id, editais(processo_id)");

      const totalPropostasEscopo = ((propostasData || []) as Array<{
        id: string;
        editais?:
          | { processo_id?: string | null }
          | { processo_id?: string | null }[]
          | null;
      }>).filter((proposta) => {
        const edital = Array.isArray(proposta.editais)
          ? proposta.editais[0]
          : proposta.editais;
        return registroNoEscopoProcesso(edital?.processo_id, escopo.processoIds);
      }).length;

      setTotalPropostas(totalPropostasEscopo);
    } else {
      setTotalPropostas(0);
    }

    if (temEditais) {
      // Mesma regra do site publico: fora de rascunho e aberto ao envio.
      const { data: editaisData } = await supabase
        .from("editais")
        .select("status,fase_atual,processo_id");

      const editaisAbertos = ((editaisData || []) as Array<
        EditalResumo & { processo_id?: string | null }
      >).filter(
        (edital) =>
          registroNoEscopoProcesso(edital.processo_id, escopo.processoIds) &&
          editalVisivelNoSitePublico(edital) &&
          editalAceitaEnvioProposta(edital)
      ).length;

      setEditaisAtivos(editaisAbertos);
    } else {
      setEditaisAtivos(0);
    }

    if (temNoticias) {
      const { data: noticiasData } = await supabase
        .from("noticias")
        .select("id, processo_id, publicado")
        .eq("publicado", true);

      const noticiasCount = ((noticiasData || []) as Array<{
        processo_id?: string | null;
      }>).filter((n) =>
        registroNoEscopoProcesso(n.processo_id, escopo.processoIds)
      ).length;

      setNoticiasPublicadas(noticiasCount);
    } else {
      setNoticiasPublicadas(0);
    }

    if (temEventos) {
      const { data: eventosData } = await supabase
        .from("eventos")
        .select("id, processo_id, publicado")
        .eq("publicado", true);

      const eventosCount = ((eventosData || []) as Array<{
        processo_id?: string | null;
      }>).filter((e) =>
        registroNoEscopoProcesso(e.processo_id, escopo.processoIds)
      ).length;

      setEventosPublicados(eventosCount);
    } else {
      setEventosPublicados(0);
    }

    if (temTransparencia) {
      const [convR, editR, prestR] = await Promise.all([
        supabase
          .from("transparencia_convenios")
          .select("id, processo_id, publicado"),
        supabase
          .from("transparencia_editais")
          .select("id, processo_id, publicado"),
        supabase
          .from("transparencia_prestacao_contas")
          .select("id, processo_id, publicado"),
      ]);

      const pendentes = [
        ...(((convR.data || []) as Array<{
          processo_id?: string | null;
          publicado?: boolean | null;
        }>)),
        ...(((editR.data || []) as Array<{
          processo_id?: string | null;
          publicado?: boolean | null;
        }>)),
        ...(((prestR.data || []) as Array<{
          processo_id?: string | null;
          publicado?: boolean | null;
        }>)),
      ].filter(
        (row) =>
          row.publicado === false &&
          registroNoEscopoProcesso(row.processo_id, escopo.processoIds)
      ).length;

      setRascunhosTransparencia(pendentes);
    } else {
      setRascunhosTransparencia(0);
    }

    if (temLogs) {
      const { data } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        setLogs(data);

        if (data.length > 0 && data[0].created_at) {
          setUltimaAtualizacao(
            new Date(data[0].created_at).toLocaleString("pt-BR")
          );
        } else {
          setUltimaAtualizacao("-");
        }
      }
    } else {
      setLogs([]);
      setUltimaAtualizacao("-");
    }

    setSincronizadoEm(new Date().toLocaleString("pt-BR"));
  }, [escopo.loading, escopo.mestre, escopo.modulos, escopo.processoIds]);

  useEffect(() => {
    if (escopo.loading) return;

    loadData();

    function recarregarSeVisivel() {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }

    window.addEventListener("focus", loadData);
    document.addEventListener("visibilitychange", recarregarSeVisivel);

    const pollId = window.setInterval(loadData, 12000);

    const channel = supabase
      .channel("admin-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "propostas" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "editais" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "noticias" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_logs" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", loadData);
      document.removeEventListener("visibilitychange", recarregarSeVisivel);
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [escopo.loading, loadData]);

  const insert = logs.filter((l) => l.acao === "INSERT").length;
  const update = logs.filter((l) => l.acao === "UPDATE").length;
  const del = logs.filter((l) => l.acao === "DELETE").length;

  const logsPorDia: Record<string, number> = {};
  logs.forEach((log) => {
    if (!log.created_at) return;
    const data = new Date(log.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    logsPorDia[data] = (logsPorDia[data] || 0) + 1;
  });

  const labels = Object.keys(logsPorDia).slice(-7);
  const values = Object.values(logsPorDia).slice(-7);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Atividade",
        data: values,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.16)",
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
        fill: true,
        tension: 0.42,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#475569" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148, 163, 184, 0.24)" },
        ticks: { color: "#475569", precision: 0 },
      },
    },
  };

  const recentes = logs.slice(0, 8);
  const temAtividade = values.some((value) => value > 0);

  const quickLinks: Array<{ href: string; title: string; text: string }> = [];
  if (pode("noticias")) {
    quickLinks.push({
      href: "/admin/noticias/form",
      title: "Nova noticia",
      text: "Publicar comunicado",
    });
  }
  if (pode("eventos")) {
    quickLinks.push({
      href: "/admin/eventos/form",
      title: "Novo evento",
      text: "Cadastrar agenda",
    });
  }
  if (pode("editais")) {
    quickLinks.push({
      href: "/admin/editais",
      title: "Editais e governanca",
      text: "Publicacao, fases e documentos",
    });
  }
  if (pode("propostas")) {
    quickLinks.push({
      href: "/admin/propostas",
      title: "Propostas",
      text: "Acompanhar inscricoes",
    });
  }
  if (pode("transparencia")) {
    quickLinks.push({
      href: "/admin/paginas/transparencia",
      title: "Transparencia",
      text: "Fechar ciclo: convenios e prestacao",
    });
  }
  if (pode("projetos")) {
    quickLinks.push({
      href: "/admin/paginas/projetos",
      title: "Projetos",
      text: "Conteúdo público do processo",
    });
  }
  if (pode("documentos")) {
    quickLinks.push({
      href: "/admin/documentos/dashboard",
      title: "Gestão Documental",
      text: "Documentos, fluxos e assinaturas",
    });
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.escopoBanner}>
        <span style={styles.escopoLabel}>Escopo</span>
        <strong style={styles.escopoTitle}>{rotuloEscopo}</strong>
      </div>

      {quickLinks.length > 0 && (
        <div style={styles.quickGrid}>
          {quickLinks.map((link) => (
            <QuickLink
              key={link.href}
              href={link.href}
              title={link.title}
              text={link.text}
            />
          ))}
        </div>
      )}

      <p style={styles.liveHint}>
        Dados ao vivo do banco · sincronizado em {sincronizadoEm}
      </p>

      <div style={styles.kpiGrid}>
        {pode("propostas") && (
          <MetricCard
            title="Propostas recebidas"
            value={totalPropostas}
            tone="green"
          />
        )}
        {pode("editais") && (
          <MetricCard
            title="Editais abertos no site"
            value={editaisAtivos}
            tone="blue"
          />
        )}
        {pode("noticias") && (
          <MetricCard
            title="Noticias publicadas"
            value={noticiasPublicadas}
            tone="slate"
          />
        )}
        {pode("eventos") && (
          <MetricCard
            title="Eventos publicados"
            value={eventosPublicados}
            tone="cyan"
          />
        )}
        {pode("transparencia") && (
          <MetricCard
            title="Transparencia pendente"
            value={rascunhosTransparencia}
            tone="slate"
          />
        )}
        {podeVerLogs && (
          <MetricCard
            title="Ultima acao"
            value={ultimaAtualizacao}
            tone="cyan"
            compact
          />
        )}
      </div>

      {podeVerLogs ? (
        <>
          <div style={styles.mainGrid}>
            <section style={styles.chartCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.darkTitle}>Atividade recente</h3>
                  <p style={styles.darkSub}>
                    Movimentacao dos ultimos registros administrativos.
                  </p>
                </div>
                <span style={styles.lightBadge}>7 dias</span>
              </div>
              {temAtividade ? (
                <div style={styles.chartBox}>
                  <Line data={chartData} options={chartOptions as any} />
                </div>
              ) : (
                <div style={styles.emptyChart}>
                  <div style={styles.emptyIcon}>0</div>
                  <strong>Nenhuma atividade recente</strong>
                  <span>
                    Quando houver salvamentos no admin, o grafico aparece aqui.
                  </span>
                </div>
              )}
            </section>

            <section style={styles.actionPanel}>
              <h3 style={styles.panelTitle}>Atividade do Sistema</h3>
              <p style={styles.panelSub}>
                Resumo rapido por tipo de alteracao.
              </p>

              <div style={styles.smallGrid}>
                <SmallCard title="Inclusao" value={insert} color="#22c55e" />
                <SmallCard title="Atualizacao" value={update} color="#38bdf8" />
                <SmallCard title="Exclusao" value={del} color="#ef4444" />
              </div>

              <div style={styles.userBox}>
                <span style={styles.userLabel}>Operador</span>
                <strong>{userEmail}</strong>
              </div>
            </section>
          </div>

          <section style={styles.tableCard}>
            <div style={{ ...styles.cardHeader, ...styles.tableHeader }}>
              <div>
                <h3 style={styles.tableTitle}>Ultimas acoes administrativas</h3>
                <p style={styles.tableSub}>
                  Auditoria resumida dos registros mais recentes.
                </p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Ação</th>
                    <th style={styles.th}>Tabela</th>
                    <th style={styles.th}>Usuário</th>
                    <th style={styles.th}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={4}>
                        Nenhuma atividade encontrada.
                      </td>
                    </tr>
                  ) : (
                    recentes.map((log, index) => (
                      <tr
                        key={log.id ?? index}
                        style={index % 2 ? styles.trAlt : styles.tr}
                      >
                        <td style={styles.td}>
                          <span style={badgeStyle(log.acao)}>
                            {labelAcaoAdmin(log.acao)}
                          </span>
                        </td>
                        <td style={styles.td}>{log.tabela || "-"}</td>
                        <td style={styles.td}>{log.user_email || "-"}</td>
                        <td style={styles.td}>
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString("pt-BR")
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section style={styles.actionPanel}>
          <h3 style={styles.panelTitle}>Painel do processo</h3>
          <p style={styles.panelSub}>
            Resumo operacional do seu escopo. Use os atalhos acima para
            navegar nos modulos liberados.
          </p>
          <div style={styles.userBox}>
            <span style={styles.userLabel}>Operador</span>
            <strong>{userEmail}</strong>
            <span style={{ color: "#93c5fd", marginTop: 6 }}>
              {rotuloEscopo}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
  compact,
}: {
  title: string;
  value: string | number;
  tone: "green" | "blue" | "slate" | "cyan";
  compact?: boolean;
}) {
  return (
    <div style={{ ...styles.metricCard, ...metricTone[tone] }}>
      <div style={styles.metricLabel}>{title}</div>
      <div style={compact ? styles.metricValueCompact : styles.metricValue}>
        {value}
      </div>
    </div>
  );
}

function SmallCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div style={styles.smallCard}>
      <div style={{ ...styles.smallValue, color }}>{value}</div>
      <div style={styles.smallLabel}>{title}</div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} style={styles.quickLink}>
      <span style={styles.quickTitle}>{title}</span>
      <span style={styles.quickText}>{text}</span>
    </Link>
  );
}

function badgeStyle(acao?: string) {
  const color =
    acao === "INSERT"
      ? "#16a34a"
      : acao === "UPDATE"
        ? "#0284c7"
        : acao === "DELETE"
          ? "#dc2626"
          : "#64748b";

  return {
    ...styles.badge,
    color,
    borderColor: `${color}55`,
    background: `${color}14`,
  };
}

const metricTone = {
  green: {
    background: "linear-gradient(135deg, #0f7a4a, #166534)",
    borderColor: "rgba(134, 239, 172, 0.44)",
  },
  blue: {
    background: "linear-gradient(135deg, #075985, #1d4ed8)",
    borderColor: "rgba(125, 211, 252, 0.44)",
  },
  slate: {
    background: "linear-gradient(135deg, #334155, #1e293b)",
    borderColor: "rgba(203, 213, 225, 0.28)",
  },
  cyan: {
    background: "linear-gradient(135deg, #155e75, #0891b2)",
    borderColor: "rgba(103, 232, 249, 0.42)",
  },
};

const styles: any = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  escopoBanner: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(14, 165, 233, 0.10)",
    border: "1px solid rgba(125, 211, 252, 0.28)",
  },

  escopoLabel: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  escopoTitle: {
    color: "#e0f2fe",
    fontSize: 15,
    fontWeight: 800,
  },

  liveHint: {
    margin: 0,
    fontSize: 12,
    color: "#64748b",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  },

  quickLink: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minHeight: 72,
    padding: "14px 16px",
    borderRadius: 16,
    textDecoration: "none",
    color: "#e0f2fe",
    background: "rgba(15, 23, 42, 0.58)",
    border: "1px solid rgba(125, 211, 252, 0.28)",
    boxShadow: "0 14px 28px rgba(2, 6, 23, 0.24)",
  },

  quickTitle: {
    fontSize: 14,
    fontWeight: 900,
  },

  quickText: {
    color: "#bfdbfe",
    fontSize: 12,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 14,
  },

  metricCard: {
    minHeight: 92,
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "15px 18px",
    boxShadow: "0 16px 34px rgba(2, 6, 23, 0.35)",
  },

  metricLabel: {
    color: "#e0f2fe",
    fontSize: 13,
    fontWeight: 800,
  },

  metricValue: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "0.02em",
  },

  metricValueCompact: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: 16,
  },

  chartCard: {
    background: "#f8fafc",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.24)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  darkTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },

  darkSub: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  lightBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 900,
  },

  chartBox: {
    height: 260,
  },

  emptyChart: {
    minHeight: 260,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    background: "linear-gradient(135deg, #eef6ff, #f8fafc)",
    border: "1px dashed #cbd5e1",
    color: "#0f172a",
    textAlign: "center",
    padding: 20,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 900,
    fontSize: 20,
  },

  actionPanel: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.38)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 18px 34px rgba(2, 6, 23, 0.35)",
  },

  panelTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: 900,
  },

  panelSub: {
    margin: "6px 0 16px",
    color: "#cbd5e1",
    fontSize: 12,
  },

  smallGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  smallCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "rgba(2, 6, 23, 0.54)",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 14,
    padding: "12px 14px",
  },

  smallValue: {
    fontSize: 24,
    fontWeight: 900,
  },

  smallLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 800,
  },

  userBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    background: "rgba(14, 165, 233, 0.12)",
    border: "1px solid rgba(125, 211, 252, 0.32)",
    color: "#e0f2fe",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
  },

  userLabel: {
    color: "#93c5fd",
    fontWeight: 800,
  },

  tableCard: {
    overflow: "hidden",
    background: "#f8fafc",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 22,
    padding: 0,
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.24)",
  },

  tableHeader: {
    padding: "18px 18px 0",
  },

  tableTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 900,
  },

  tableSub: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#0f172a",
    fontSize: 13,
  },

  th: {
    background: "#1f2937",
    color: "#ffffff",
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  tr: {
    background: "#ffffff",
  },

  trAlt: {
    background: "#f1f5f9",
  },

  td: {
    padding: "11px 12px",
    borderTop: "1px solid #e2e8f0",
    verticalAlign: "top",
  },

  emptyCell: {
    padding: 18,
    color: "#64748b",
    textAlign: "center",
  },

  badge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 11,
    fontWeight: 900,
  },
};
