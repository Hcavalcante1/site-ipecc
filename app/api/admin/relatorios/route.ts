import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { verifyAdminSession } from "@/lib/auth/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Formato = "csv" | "pdf";
type Tipo = "propostas" | "beneficiarios" | "editais" | "lgpd" | "resumo";

// ─── CSV helpers ────────────────────────────────────────────────────────────

function csvLinha(campos: (string | number | null | undefined)[]): string {
  return campos
    .map((v) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

function respCsv(linhas: string[], nome: string): NextResponse {
  const bom = "﻿"; // BOM UTF-8 para Excel
  const body = bom + linhas.join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}

// ─── PDF helper ─────────────────────────────────────────────────────────────

async function criarPdf(titulo: string, subtitulo: string, secoes: { nome: string; linhas: string[][] }[]): Promise<Uint8Array> {
  const doc   = await PDFDocument.create();
  const font  = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  const COR_PRIMARIA = rgb(0.11, 0.30, 0.85);
  const COR_TEXTO    = rgb(0.12, 0.14, 0.18);
  const COR_CINZA    = rgb(0.55, 0.63, 0.69);
  const COR_LINHA    = rgb(0.90, 0.91, 0.93);

  function novaPage() {
    const p = doc.addPage([595, 842]); // A4
    let y = 810;

    // Cabeçalho
    p.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: COR_PRIMARIA });
    p.drawText("IPECC", { x: 36, y: 820, size: 18, font: fontB, color: rgb(1, 1, 1) });
    p.drawText(titulo, { x: 36, y: 803, size: 9, font, color: rgb(0.8, 0.88, 1) });
    p.drawText(subtitulo, { x: 595 - 36 - font.widthOfTextAtSize(subtitulo, 8), y: 805, size: 8, font, color: rgb(0.7, 0.78, 1) });

    y = 775;
    return { p, getY: () => y, setY: (v: number) => { y = v; }, consumirY: (n: number) => { y -= n; return y; } };
  }

  let atual = novaPage();

  function garantirEspaco(n: number) {
    if (atual.getY() < 60 + n) {
      // rodapé página atual
      atual.p.drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, {
        x: 36, y: 30, size: 7, font, color: COR_CINZA,
      });
      atual = novaPage();
    }
  }

  for (const secao of secoes) {
    garantirEspaco(60);

    // Título da seção
    atual.p.drawText(secao.nome.toUpperCase(), {
      x: 36, y: atual.getY(), size: 8, font: fontB, color: COR_PRIMARIA,
    });
    atual.consumirY(14);

    if (secao.linhas.length === 0) {
      atual.p.drawText("Nenhum registro encontrado.", { x: 36, y: atual.getY(), size: 9, font, color: COR_CINZA });
      atual.consumirY(20);
      continue;
    }

    const cabecalho = secao.linhas[0];
    const dados     = secao.linhas.slice(1);

    // Largura de colunas distribuída proporcionalmente
    const totalW   = 523;
    const colW     = Math.floor(totalW / cabecalho.length);
    const colWidths = cabecalho.map((_, i) => i === cabecalho.length - 1 ? totalW - colW * (cabecalho.length - 1) : colW);

    // Cabeçalho da tabela
    garantirEspaco(20);
    atual.p.drawRectangle({ x: 36, y: atual.getY() - 2, width: totalW, height: 16, color: rgb(0.94, 0.95, 0.97) });
    let cx = 36;
    for (let i = 0; i < cabecalho.length; i++) {
      const txt = cabecalho[i].slice(0, Math.floor(colWidths[i] / 5.5));
      atual.p.drawText(txt, { x: cx + 3, y: atual.getY() + 1, size: 7, font: fontB, color: COR_TEXTO });
      cx += colWidths[i];
    }
    atual.consumirY(18);

    // Linhas de dados
    for (let r = 0; r < dados.length; r++) {
      garantirEspaco(14);
      if (r % 2 === 1) {
        atual.p.drawRectangle({ x: 36, y: atual.getY() - 2, width: totalW, height: 13, color: rgb(0.97, 0.97, 0.98) });
      }
      let dx = 36;
      for (let i = 0; i < dados[r].length; i++) {
        const maxChars = Math.floor(colWidths[i] / 5.2);
        const txt = String(dados[r][i] ?? "—").slice(0, maxChars);
        atual.p.drawText(txt, { x: dx + 3, y: atual.getY() + 1, size: 7, font, color: COR_TEXTO });
        dx += colWidths[i];
      }
      atual.consumirY(13);

      // Separador
      atual.p.drawLine({ start: { x: 36, y: atual.getY() + 11 }, end: { x: 559, y: atual.getY() + 11 }, thickness: 0.3, color: COR_LINHA });
    }

    atual.consumirY(16);
  }

  // Rodapé última página
  atual.p.drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · IPECC Plataforma Institucional`, {
    x: 36, y: 30, size: 7, font, color: COR_CINZA,
  });

  return doc.save();
}

// ─── Handlers de dados ──────────────────────────────────────────────────────

async function dadosPropostas(supabase: ReturnType<typeof getSupabaseAdmin>, inicio?: string, fim?: string) {
  let q = supabase
    .from("propostas")
    .select("id, nome_proponente, cpf_cnpj, email, status, created_at, editais(titulo)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (inicio) q = q.gte("created_at", inicio);
  if (fim)    q = q.lte("created_at", fim + "T23:59:59");

  const { data } = await q;
  return (data ?? []) as unknown as {
    id: string;
    nome_proponente: string | null;
    cpf_cnpj: string | null;
    email: string | null;
    status: string | null;
    created_at: string;
    editais: { titulo: string } | null;
  }[];
}

async function dadosBeneficiarios(supabase: ReturnType<typeof getSupabaseAdmin>, inicio?: string, fim?: string) {
  let q = supabase
    .from("beneficiarios")
    .select("id, nome, cpf, data_nascimento, municipio, status, created_at")
    .order("nome", { ascending: true })
    .limit(500);

  if (inicio) q = q.gte("created_at", inicio);
  if (fim)    q = q.lte("created_at", fim + "T23:59:59");

  const { data } = await q;
  return (data ?? []) as {
    id: string;
    nome: string | null;
    cpf: string | null;
    data_nascimento: string | null;
    municipio: string | null;
    status: string | null;
    created_at: string;
  }[];
}

async function dadosEditais(supabase: ReturnType<typeof getSupabaseAdmin>, inicio?: string, fim?: string) {
  let q = supabase
    .from("editais")
    .select("id, titulo, status, fase_atual, tipo, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (inicio) q = q.gte("created_at", inicio);
  if (fim)    q = q.lte("created_at", fim + "T23:59:59");

  const { data } = await q;
  return (data ?? []) as {
    id: string;
    titulo: string | null;
    status: string | null;
    fase_atual: string | null;
    tipo: string | null;
    created_at: string;
  }[];
}

async function dadosLgpd(supabase: ReturnType<typeof getSupabaseAdmin>, inicio?: string, fim?: string) {
  let q = supabase
    .from("lgpd_solicitacoes")
    .select("id, tipo, nome, email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (inicio) q = q.gte("created_at", inicio);
  if (fim)    q = q.lte("created_at", fim + "T23:59:59");

  const { data } = await q;
  return (data ?? []) as {
    id: string;
    tipo: string | null;
    nome: string | null;
    email: string | null;
    status: string | null;
    created_at: string;
  }[];
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── Handler principal ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const { searchParams } = req.nextUrl;
  const tipo    = (searchParams.get("tipo")    ?? "propostas") as Tipo;
  const formato = (searchParams.get("formato") ?? "csv")       as Formato;
  const inicio  = searchParams.get("inicio")   ?? undefined;
  const fim     = searchParams.get("fim")      ?? undefined;

  const supabase = getSupabaseAdmin();

  const { data: org } = await supabase
    .from("organizacoes")
    .select("nome")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const orgNome   = org?.nome ?? "IPECC";
  const periodoTxt = inicio || fim ? `${inicio ?? "início"} a ${fim ?? "hoje"}` : "todos os períodos";
  const agora      = new Date().toISOString().slice(0, 10);

  if (formato === "csv") {
    if (tipo === "propostas") {
      const rows = await dadosPropostas(supabase, inicio, fim);
      const linhas = [
        csvLinha(["ID", "Proponente", "CPF/CNPJ", "E-mail", "Edital", "Status", "Data"]),
        ...rows.map((r) =>
          csvLinha([r.id, r.nome_proponente, r.cpf_cnpj, r.email, r.editais?.titulo, r.status, fmtData(r.created_at)])
        ),
      ];
      return respCsv(linhas, `propostas-${agora}.csv`);
    }

    if (tipo === "beneficiarios") {
      const rows = await dadosBeneficiarios(supabase, inicio, fim);
      const linhas = [
        csvLinha(["ID", "Nome", "CPF", "Nascimento", "Município", "Status", "Cadastrado em"]),
        ...rows.map((r) =>
          csvLinha([r.id, r.nome, r.cpf, r.data_nascimento ? fmtData(r.data_nascimento) : "", r.municipio, r.status, fmtData(r.created_at)])
        ),
      ];
      return respCsv(linhas, `beneficiarios-${agora}.csv`);
    }

    if (tipo === "editais") {
      const rows = await dadosEditais(supabase, inicio, fim);
      const linhas = [
        csvLinha(["ID", "Título", "Tipo", "Status", "Fase", "Publicado em"]),
        ...rows.map((r) =>
          csvLinha([r.id, r.titulo, r.tipo, r.status, r.fase_atual, fmtData(r.created_at)])
        ),
      ];
      return respCsv(linhas, `editais-${agora}.csv`);
    }

    if (tipo === "lgpd") {
      const rows = await dadosLgpd(supabase, inicio, fim);
      const linhas = [
        csvLinha(["ID", "Tipo", "Nome", "E-mail", "Status", "Data"]),
        ...rows.map((r) =>
          csvLinha([r.id, r.tipo, r.nome, r.email, r.status, fmtData(r.created_at)])
        ),
      ];
      return respCsv(linhas, `lgpd-${agora}.csv`);
    }
  }

  if (formato === "pdf") {
    const [propostas, beneficiarios, editais, lgpd] = await Promise.all([
      tipo === "resumo" || tipo === "propostas"     ? dadosPropostas(supabase, inicio, fim)     : Promise.resolve([]),
      tipo === "resumo" || tipo === "beneficiarios" ? dadosBeneficiarios(supabase, inicio, fim) : Promise.resolve([]),
      tipo === "resumo" || tipo === "editais"        ? dadosEditais(supabase, inicio, fim)        : Promise.resolve([]),
      tipo === "resumo" || tipo === "lgpd"           ? dadosLgpd(supabase, inicio, fim)           : Promise.resolve([]),
    ]);

    const secoes: { nome: string; linhas: string[][] }[] = [];

    if (propostas.length > 0 || tipo === "propostas" || tipo === "resumo") {
      secoes.push({
        nome: "Propostas recebidas",
        linhas: [
          ["Proponente", "Edital", "Status", "Data"],
          ...propostas.slice(0, 50).map((r) => [r.nome_proponente ?? "—", r.editais?.titulo ?? "—", r.status ?? "—", fmtData(r.created_at)]),
        ],
      });
    }
    if (editais.length > 0 || tipo === "editais" || tipo === "resumo") {
      secoes.push({
        nome: "Editais",
        linhas: [
          ["Título", "Tipo", "Status", "Fase", "Data"],
          ...editais.slice(0, 50).map((r) => [r.titulo ?? "—", r.tipo ?? "—", r.status ?? "—", r.fase_atual ?? "—", fmtData(r.created_at)]),
        ],
      });
    }
    if (beneficiarios.length > 0 || tipo === "beneficiarios" || tipo === "resumo") {
      secoes.push({
        nome: "Beneficiários",
        linhas: [
          ["Nome", "Município", "Status", "Cadastrado em"],
          ...beneficiarios.slice(0, 50).map((r) => [r.nome ?? "—", r.municipio ?? "—", r.status ?? "—", fmtData(r.created_at)]),
        ],
      });
    }
    if (lgpd.length > 0 || tipo === "lgpd" || tipo === "resumo") {
      secoes.push({
        nome: "Solicitações LGPD",
        linhas: [
          ["Tipo", "Nome", "Status", "Data"],
          ...lgpd.slice(0, 50).map((r) => [r.tipo ?? "—", r.nome ?? "—", r.status ?? "—", fmtData(r.created_at)]),
        ],
      });
    }

    const nomeRelatorio = tipo === "resumo" ? "Relatório Institucional" : `Relatório de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    const pdfBytes = await criarPdf(
      nomeRelatorio,
      `${orgNome} · ${periodoTxt}`,
      secoes.length > 0 ? secoes : [{ nome: "Sem dados", linhas: [] }]
    );

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${tipo}-${agora}.pdf"`,
      },
    });
  }

  return NextResponse.json({ ok: false, error: "formato_invalido" }, { status: 400 });
}
