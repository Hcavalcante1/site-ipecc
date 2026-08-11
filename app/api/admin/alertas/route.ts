import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSession } from "@/lib/auth/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLA_LGPD_DIAS = 15;

export type NivelAlerta = "critico" | "atencao" | "info";

export type Alerta = {
  id:       string;
  nivel:    NivelAlerta;
  modulo:   string;
  titulo:   string;
  descricao: string;
  cta_label: string;
  cta_href:  string;
  valor?:   number;
};

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function diasAte(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const alertas: Alerta[] = [];

  await Promise.allSettled([

    // ── LGPD ────────────────────────────────────────────────────────────────
    (async () => {
      const { data } = await supabase
        .from("lgpd_solicitacoes")
        .select("id, nome, tipo, created_at, status")
        .in("status", ["pendente", "em_andamento"])
        .order("created_at", { ascending: true });

      const pendentes = (data ?? []) as { id: string; nome: string; tipo: string; created_at: string; status: string }[];
      const vencidas  = pendentes.filter((s) => diasDesde(s.created_at) >= SLA_LGPD_DIAS);
      const emRisco   = pendentes.filter((s) => {
        const d = diasDesde(s.created_at);
        return d >= SLA_LGPD_DIAS - 5 && d < SLA_LGPD_DIAS;
      });

      if (vencidas.length > 0) {
        alertas.push({
          id:        "lgpd-vencidas",
          nivel:     "critico",
          modulo:    "LGPD",
          titulo:    `${vencidas.length} solicitação(ões) LGPD com prazo vencido`,
          descricao: `Ultrapassaram ${SLA_LGPD_DIAS} dias sem resposta. Risco legal imediato.`,
          cta_label: "Responder agora",
          cta_href:  "/admin/lgpd",
          valor:     vencidas.length,
        });
      }
      if (emRisco.length > 0) {
        alertas.push({
          id:        "lgpd-risco",
          nivel:     "atencao",
          modulo:    "LGPD",
          titulo:    `${emRisco.length} solicitação(ões) LGPD vencendo em breve`,
          descricao: `Prazo expira nos próximos 5 dias. Responda antes da data limite.`,
          cta_label: "Verificar",
          cta_href:  "/admin/lgpd",
          valor:     emRisco.length,
        });
      }
      if (pendentes.length > 0 && vencidas.length === 0 && emRisco.length === 0) {
        alertas.push({
          id:        "lgpd-pendentes",
          nivel:     "info",
          modulo:    "LGPD",
          titulo:    `${pendentes.length} solicitação(ões) LGPD em aberto`,
          descricao: "Todas dentro do prazo legal de 15 dias.",
          cta_label: "Ver solicitações",
          cta_href:  "/admin/lgpd",
          valor:     pendentes.length,
        });
      }
    })(),

    // ── Propostas antigas ────────────────────────────────────────────────────
    (async () => {
      const { data } = await supabase
        .from("propostas")
        .select("id, nome_proponente, nome, created_at, criado_em, status")
        .in("status", ["pendente", "recebida", "em_analise"])
        .order("created_at", { ascending: true });

      const lista = (data ?? []) as { id: string; nome_proponente: string | null; nome: string | null; created_at: string | null; criado_em: string | null; status: string }[];

      const muitoAntigas = lista.filter((p) => {
        const dt = p.criado_em ?? p.created_at ?? "";
        return dt && diasDesde(dt) > 60;
      });
      const antigas = lista.filter((p) => {
        const dt = p.criado_em ?? p.created_at ?? "";
        return dt && diasDesde(dt) > 30 && diasDesde(dt) <= 60;
      });

      if (muitoAntigas.length > 0) {
        alertas.push({
          id:        "propostas-criticas",
          nivel:     "critico",
          modulo:    "Propostas",
          titulo:    `${muitoAntigas.length} proposta(s) pendente(s) há mais de 60 dias`,
          descricao: "Proponentes aguardam resposta há mais de 2 meses.",
          cta_label: "Analisar",
          cta_href:  "/admin/propostas",
          valor:     muitoAntigas.length,
        });
      }
      if (antigas.length > 0) {
        alertas.push({
          id:        "propostas-antigas",
          nivel:     "atencao",
          modulo:    "Propostas",
          titulo:    `${antigas.length} proposta(s) pendente(s) há 30–60 dias`,
          descricao: "Proponentes aguardam análise há mais de um mês.",
          cta_label: "Analisar",
          cta_href:  "/admin/propostas",
          valor:     antigas.length,
        });
      }
      if (lista.length > 0 && muitoAntigas.length === 0 && antigas.length === 0) {
        alertas.push({
          id:        "propostas-recentes",
          nivel:     "info",
          modulo:    "Propostas",
          titulo:    `${lista.length} proposta(s) pendente(s)`,
          descricao: "Todas recebidas há menos de 30 dias. Em dia.",
          cta_label: "Ver propostas",
          cta_href:  "/admin/propostas",
          valor:     lista.length,
        });
      }
    })(),

    // ── Editais encerrando ────────────────────────────────────────────────────
    (async () => {
      const { data } = await supabase
        .from("editais")
        .select("id, titulo, data_fim_inscricoes, status")
        .not("data_fim_inscricoes", "is", null)
        .in("status", ["publicado", "aberto", "inscricoes_abertas"])
        .order("data_fim_inscricoes", { ascending: true });

      const agora = new Date();
      const prox7  = new Date(agora.getTime() + 7  * 86400000);
      const prox15 = new Date(agora.getTime() + 15 * 86400000);

      const enc = (data ?? []) as { id: string; titulo: string | null; data_fim_inscricoes: string; status: string }[];
      const urgente  = enc.filter((e) => new Date(e.data_fim_inscricoes) <= prox7  && new Date(e.data_fim_inscricoes) > agora);
      const proximo  = enc.filter((e) => new Date(e.data_fim_inscricoes) <= prox15 && new Date(e.data_fim_inscricoes) > prox7);

      if (urgente.length > 0) {
        const d = diasAte(urgente[0].data_fim_inscricoes);
        alertas.push({
          id:        "editais-urgente",
          nivel:     "atencao",
          modulo:    "Editais",
          titulo:    `${urgente.length} edital(is) encerra(m) em até 7 dias`,
          descricao: `"${urgente[0].titulo ?? "sem título"}" fecha ${d <= 0 ? "hoje" : `em ${d}d`}.`,
          cta_label: "Ver editais",
          cta_href:  "/admin/editais",
          valor:     urgente.length,
        });
      } else if (proximo.length > 0) {
        alertas.push({
          id:        "editais-proximo",
          nivel:     "info",
          modulo:    "Editais",
          titulo:    `${proximo.length} edital(is) encerra(m) em 8–15 dias`,
          descricao: "Verifique se os formulários e documentos estão prontos.",
          cta_label: "Ver editais",
          cta_href:  "/admin/editais",
          valor:     proximo.length,
        });
      }
    })(),

    // ── Beneficiários suspensos ────────────────────────────────────────────
    (async () => {
      const { data, error } = await supabase
        .from("beneficiarios")
        .select("id, nome, created_at")
        .eq("status", "suspenso");

      if (error || !data || data.length === 0) return;
      const lista = data as { id: string; nome: string; created_at: string }[];
      const antigos = lista.filter((b) => diasDesde(b.created_at) > 30);

      if (antigos.length > 0) {
        alertas.push({
          id:        "beneficiarios-suspensos",
          nivel:     "atencao",
          modulo:    "Beneficiários",
          titulo:    `${antigos.length} beneficiário(s) suspenso(s) há mais de 30 dias`,
          descricao: "Verifique se a suspensão deve ser mantida, regularizada ou encerrada.",
          cta_label: "Ver beneficiários",
          cta_href:  "/admin/beneficiarios",
          valor:     antigos.length,
        });
      }
    })(),

    // ── Diagnóstico ─────────────────────────────────────────────────────────
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/diagnostico`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json() as { resumo?: { pontuacao?: number; erros?: number } };
        const score = json.resumo?.pontuacao ?? 100;
        const erros = json.resumo?.erros ?? 0;

        if (score < 50) {
          alertas.push({
            id:        "diagnostico-critico",
            nivel:     "critico",
            modulo:    "Plataforma",
            titulo:    `Saúde da plataforma crítica (${score}%)`,
            descricao: `${erros} verificação(ões) com erro. Ação imediata necessária.`,
            cta_label: "Ver diagnóstico",
            cta_href:  "/admin/diagnostico",
            valor:     score,
          });
        } else if (score < 75) {
          alertas.push({
            id:        "diagnostico-atencao",
            nivel:     "atencao",
            modulo:    "Plataforma",
            titulo:    `Saúde da plataforma requer atenção (${score}%)`,
            descricao: `${erros} verificação(ões) com erro detectada(s) no diagnóstico.`,
            cta_label: "Ver diagnóstico",
            cta_href:  "/admin/diagnostico",
            valor:     score,
          });
        }
      } catch {
        // diagnóstico indisponível — não bloqueia
      }
    })(),

    // ── Assinatura ─────────────────────────────────────────────────────────
    (async () => {
      const { data } = await supabase
        .from("assinaturas")
        .select("status, plano, periodo_fim")
        .maybeSingle();

      if (!data) return;
      const ass = data as { status: string; plano: string; periodo_fim: string | null };

      if (ass.status === "past_due" || ass.status === "unpaid") {
        alertas.push({
          id:        "assinatura-vencida",
          nivel:     "critico",
          modulo:    "Faturamento",
          titulo:    "Pagamento da assinatura em atraso",
          descricao: `Status: ${ass.status}. Regularize para evitar suspensão da plataforma.`,
          cta_label: "Ir para faturamento",
          cta_href:  "/admin/faturamento",
        });
      } else if (ass.periodo_fim) {
        const dias = diasAte(ass.periodo_fim);
        if (dias <= 7 && dias > 0) {
          alertas.push({
            id:        "assinatura-vencendo",
            nivel:     "atencao",
            modulo:    "Faturamento",
            titulo:    `Assinatura ${ass.plano} vence em ${dias} dia(s)`,
            descricao: "Renove para evitar interrupção do serviço.",
            cta_label: "Renovar",
            cta_href:  "/admin/faturamento",
            valor:     dias,
          });
        }
      }
    })(),
  ]);

  const ordenados = alertas.sort((a, b) => {
    const ord: Record<NivelAlerta, number> = { critico: 0, atencao: 1, info: 2 };
    return ord[a.nivel] - ord[b.nivel];
  });

  const criticos = ordenados.filter((a) => a.nivel === "critico").length;
  const atencoes = ordenados.filter((a) => a.nivel === "atencao").length;

  return NextResponse.json({
    alertas: ordenados,
    resumo: { total: ordenados.length, criticos, atencoes, info: ordenados.length - criticos - atencoes },
  });
}
