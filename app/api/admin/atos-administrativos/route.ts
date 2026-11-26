import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { isMestre } from "@/lib/auth/adminEscopo";
import { fetchPaginaConteudo, parsePaginaExtra } from "@/lib/cms/paginasConteudo";
import { revalidatePaginaPublica } from "@/lib/cms/revalidatePaginas";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const CMS_PAGE = "transparencia";
const CMS_BLOCK = "atos_administrativos";
const STORAGE_PREFIX = "atos-administrativos/";
const CATEGORIAS = new Set([
  "Assembleia",
  "Ata",
  "Resolução",
  "Portaria",
  "Estatuto e alterações",
  "Comunicado institucional",
  "Outro",
]);

type Ato = {
  id: string;
  titulo: string;
  categoria: string;
  resumo: string;
  arquivo: string;
  data: string | null;
  publicado: boolean;
  publicado_em: string | null;
  criado_em: string;
};

function isSafeActFile(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 300 || value.includes("..") || value.startsWith("/")) return false;
  if (value.startsWith(STORAGE_PREFIX)) {
    const name = value.slice(STORAGE_PREFIX.length);
    return /^[a-zA-Z0-9._-]+\.pdf$/i.test(name);
  }

  return /^governanca-editais\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+\.pdf$/i.test(value);
}

function normalizarAtos(value: unknown, anteriores: Ato[] = []): Ato[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const agora = new Date().toISOString();
  const anterioresPorId = new Map(anteriores.map((ato) => [ato.id, ato]));
  const result: Ato[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const titulo = typeof row.titulo === "string" ? row.titulo.trim().slice(0, 240) : "";
    const categoria = typeof row.categoria === "string" ? row.categoria.trim() : "";
    const resumo = typeof row.resumo === "string" ? row.resumo.trim().slice(0, 3000) : "";
    const arquivo = row.arquivo === "" || row.arquivo == null ? "" : row.arquivo;
    const data = typeof row.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.data)
      ? row.data
      : null;
    const publicado = row.publicado === true;

    if (!id || id.length > 80 || !titulo || !CATEGORIAS.has(categoria)) return null;
    if (arquivo !== "" && !isSafeActFile(arquivo)) return null;
    if (publicado && !arquivo) return null;

    const anterior = anterioresPorId.get(id);
    result.push({
      id,
      titulo,
      categoria,
      resumo,
      arquivo: arquivo as string,
      data,
      publicado,
      publicado_em: publicado ? (anterior?.publicado_em || agora) : null,
      criado_em: anterior?.criado_em || agora,
    });
  }

  if (new Set(result.map((ato) => ato.id)).size !== result.length) return null;
  return result;
}

async function requireMaster() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return { response: NextResponse.json({ ok: false, error: auth.message }, { status: auth.status }) };
  }
  if (!isMestre(auth.contexto)) {
    return { response: NextResponse.json({ ok: false, error: "Somente o administrador mestre pode gerenciar atos institucionais." }, { status: 403 }) };
  }
  return { response: null };
}

async function lerAtos(): Promise<Ato[]> {
  const row = await fetchPaginaConteudo(supabaseAdmin, CMS_PAGE, CMS_BLOCK, "extra");
  return parsePaginaExtra<{ atos?: Ato[] }>(row?.extra, {}).atos || [];
}

async function salvarAtos(atos: Ato[]) {
  const payload = {
    pagina_slug: CMS_PAGE,
    bloco: CMS_BLOCK,
    titulo: "Atos Administrativos da Entidade",
    texto: "Publicações oficiais da entidade.",
    extra: { atos },
    updated_at: new Date().toISOString(),
  };

  // Segue o fluxo comum do Admin: atualiza o bloco existente e só insere
  // quando ainda não existe. A autorização continua validada nesta API.
  const updated = await supabaseAdmin
    .from("paginas_conteudo")
    .update(payload)
    .eq("pagina_slug", CMS_PAGE)
    .eq("bloco", CMS_BLOCK)
    .select("id");

  if (updated.error) return { error: updated.error };
  if (Array.isArray(updated.data) && updated.data.length > 0) return { error: null };

  const inserted = await supabaseAdmin.from("paginas_conteudo").insert(payload);
  return { error: inserted.error };
}

async function lerDocumentosExistentes() {
  const { data, error } = await supabaseAdmin
    .from("documentos_publicos")
    .select("titulo,arquivo_url,publicado")
    .eq("publicado", true)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const arquivos = (data || [])
    .filter((row) => isSafeActFile(row.arquivo_url) && String(row.arquivo_url).startsWith("governanca-editais/"))
    .map((row) => ({
      titulo: String(row.titulo || "PDF publicado em Editais"),
      arquivo: String(row.arquivo_url),
    }));
  return [...new Map(arquivos.map((row) => [row.arquivo, row])).values()];
}

export async function GET() {
  const gate = await requireMaster();
  if (gate.response) return gate.response;
  try {
    const [atos, documentosExistentes] = await Promise.all([lerAtos(), lerDocumentosExistentes()]);
    return NextResponse.json({ ok: true, atos, documentosExistentes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os atos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireMaster();
  if (gate.response) return gate.response;

  try {
    const body = await req.json().catch(() => null) as { atos?: unknown } | null;
    const anteriores = await lerAtos();
    const atos = normalizarAtos(body?.atos, anteriores);
    if (!atos) {
      return NextResponse.json({ ok: false, error: "Confira os dados dos atos. Toda publicação precisa ter título, categoria e PDF." }, { status: 400 });
    }

    const { error } = await salvarAtos(atos);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const retainedFiles = new Set(atos.map((ato) => ato.arquivo).filter(Boolean));
    const removedFiles = [...new Set(anteriores.map((ato) => ato.arquivo).filter(Boolean))]
      .filter((path) => path.startsWith(STORAGE_PREFIX) && !retainedFiles.has(path));
    let warning: string | undefined;
    if (removedFiles.length) {
      const { error: removeError } = await supabaseAdmin.storage.from("docs").remove(removedFiles);
      if (removeError) warning = "O ato foi atualizado, mas um PDF antigo não pôde ser removido do armazenamento.";
    }

    revalidatePaginaPublica(CMS_PAGE);
    return NextResponse.json({ ok: true, atos, ...(warning ? { warning } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar os atos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireMaster();
  if (gate.response) return gate.response;
  const path = req.nextUrl.searchParams.get("arquivo") || "";
  if (!path.startsWith(STORAGE_PREFIX) || !isSafeActFile(path)) {
    return NextResponse.json({ ok: false, error: "Arquivo de ato inválido." }, { status: 400 });
  }
  const { error } = await supabaseAdmin.storage.from("docs").remove([path]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
