/**
 * Ponte do ciclo institucional: Propostas/Governanca -> rascunhos de Transparencia.
 * Nunca marca publicado=true. Idempotente.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PonteResultado = {
  ok: boolean;
  criado?: boolean;
  atualizado?: boolean;
  id?: string | null;
  message?: string;
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function criarConvenioRascunhoDeProposta(
  propostaId: string
): Promise<PonteResultado> {
  if (!isUuid(propostaId)) {
    return { ok: false, message: "proposta_id invalido." };
  }

  const { data: existente } = await supabaseAdmin
    .from("transparencia_convenios")
    .select("id")
    .eq("proposta_id", propostaId)
    .maybeSingle();

  if (existente?.id) {
    return {
      ok: true,
      criado: false,
      id: existente.id,
      message: "Rascunho de convenio ja existe para esta proposta.",
    };
  }

  const { data: proposta, error: propErr } = await supabaseAdmin
    .from("propostas")
    .select("id, nome, cnpj, edital_id, status")
    .eq("id", propostaId)
    .maybeSingle();

  if (propErr) {
    return { ok: false, message: propErr.message };
  }
  if (!proposta) {
    return { ok: false, message: "Proposta nao encontrada." };
  }
  if (String(proposta.status || "") !== "aprovado") {
    return {
      ok: false,
      message: "Somente proposta aprovada gera rascunho de convenio.",
    };
  }

  let processoId: string | null = null;
  let editalId: string | null = isUuid(proposta.edital_id)
    ? proposta.edital_id
    : null;

  if (editalId) {
    const { data: edital } = await supabaseAdmin
      .from("editais")
      .select("id, processo_id, titulo")
      .eq("id", editalId)
      .maybeSingle();
    processoId = edital?.processo_id || null;
  }

  const tituloBase =
    proposta.nome?.trim() ||
    "Convenio gerado a partir de proposta aprovada";

  const { data: criado, error: insErr } = await supabaseAdmin
    .from("transparencia_convenios")
    .insert({
      proposta_id: propostaId,
      processo_id: processoId,
      edital_id: editalId,
      titulo: `Convenio — ${tituloBase}`,
      contratado: proposta.nome || null,
      cnpj: proposta.cnpj || null,
      status: "Em elaboracao",
      categoria: "Resultado de selecao",
      objeto: "Rascunho automatico apos aprovacao de proposta. Revisar antes de publicar.",
      ordem: 0,
      publicado: false,
    })
    .select("id")
    .single();

  if (insErr) {
    // Colunas novas ainda nao aplicadas no Supabase
    if (/proposta_id|processo_id|column/i.test(insErr.message)) {
      return {
        ok: false,
        message:
          "Aplique docs/sql/transparencia-modulo-ciclo-fase-1.sql no Supabase e tente novamente.",
      };
    }
    return { ok: false, message: insErr.message };
  }

  return {
    ok: true,
    criado: true,
    id: criado?.id || null,
    message: "Rascunho de convenio criado na Transparencia.",
  };
}

export async function criarPrestacaoRascunhoDeConvenio(
  convenioId: string
): Promise<PonteResultado> {
  if (!isUuid(convenioId)) {
    return { ok: false, message: "convenio_id invalido." };
  }

  const { data: convenio, error: convErr } = await supabaseAdmin
    .from("transparencia_convenios")
    .select("id, titulo, processo_id, publicado")
    .eq("id", convenioId)
    .maybeSingle();

  if (convErr) return { ok: false, message: convErr.message };
  if (!convenio) return { ok: false, message: "Convenio nao encontrado." };

  const { data: existentes } = await supabaseAdmin
    .from("transparencia_prestacao_contas")
    .select("id")
    .eq("convenio_id", convenioId)
    .limit(1);

  if (existentes && existentes.length > 0) {
    return {
      ok: true,
      criado: false,
      id: existentes[0].id,
      message: "Ja existe prestacao vinculada a este convenio.",
    };
  }

  const { data: criado, error: insErr } = await supabaseAdmin
    .from("transparencia_prestacao_contas")
    .insert({
      convenio_id: convenioId,
      processo_id: convenio.processo_id || null,
      fase_prestacao: "Inicial",
      status_prestacao: "Pendente",
      tipo_documento: "Prestacao de contas",
      documento_titulo: `Prestacao — ${convenio.titulo || "convenio"}`,
      observacoes:
        "Rascunho automatico do ciclo Transparencia. Anexar documento e publicar.",
      ordem: 0,
      publicado: false,
    })
    .select("id")
    .single();

  if (insErr) {
    if (/processo_id|column/i.test(insErr.message)) {
      return {
        ok: false,
        message:
          "Aplique docs/sql/transparencia-modulo-ciclo-fase-1.sql no Supabase e tente novamente.",
      };
    }
    return { ok: false, message: insErr.message };
  }

  return {
    ok: true,
    criado: true,
    id: criado?.id || null,
    message: "Rascunho de prestacao criado.",
  };
}

type DocEspelho = {
  tipo?: string | null;
  titulo?: string | null;
  arquivo_url?: string | null;
  url?: string | null;
};

export async function espelharDocumentoGovernanca(
  editalId: string,
  documento: DocEspelho
): Promise<PonteResultado> {
  if (!isUuid(editalId)) {
    return { ok: false, message: "edital_id invalido." };
  }

  const tipo = String(documento.tipo || "").trim();
  const url = String(documento.arquivo_url || documento.url || "").trim();
  const titulo = String(documento.titulo || "").trim();

  if (!tipo) {
    return { ok: false, message: "tipo de documento obrigatorio." };
  }

  const { data: edital, error: edErr } = await supabaseAdmin
    .from("editais")
    .select("id, processo_id, titulo, fase_atual")
    .eq("id", editalId)
    .maybeSingle();

  if (edErr) return { ok: false, message: edErr.message };
  if (!edital) return { ok: false, message: "Edital nao encontrado." };

  const { data: row } = await supabaseAdmin
    .from("transparencia_editais")
    .select("*")
    .eq("edital_id", editalId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    edital_id: editalId,
    processo_id: edital.processo_id || null,
    publicado: false,
    status_fase: edital.fase_atual || row?.status_fase || null,
  };

  if (tipo === "resultado_preliminar") {
    if (titulo) patch.resultado_preliminar_titulo = titulo;
    if (url) patch.resultado_preliminar_url = url;
  } else if (tipo === "resultado_final") {
    if (titulo) patch.resultado_final_titulo = titulo;
    if (url) patch.resultado_final_url = url;
  } else if (tipo === "homologacao") {
    if (titulo) patch.homologacao_titulo = titulo;
    if (url) patch.homologacao_url = url;
  } else if (tipo === "contrato" || tipo === "termo_parceria") {
    if (titulo) patch.contrato_titulo = titulo;
    if (url) patch.contrato_url = url;
  } else {
    return {
      ok: true,
      criado: false,
      message: `Tipo ${tipo} nao exige espelho em transparencia_editais.`,
    };
  }

  if (row?.id) {
    const { error } = await supabaseAdmin
      .from("transparencia_editais")
      .update(patch)
      .eq("id", row.id);
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      atualizado: true,
      id: row.id,
      message: "Espelho de transparencia_editais atualizado (rascunho).",
    };
  }

  const { data: criado, error: insErr } = await supabaseAdmin
    .from("transparencia_editais")
    .insert(patch)
    .select("id")
    .single();

  if (insErr) {
    if (/processo_id|column/i.test(insErr.message)) {
      return {
        ok: false,
        message:
          "Aplique docs/sql/transparencia-modulo-ciclo-fase-1.sql no Supabase e tente novamente.",
      };
    }
    return { ok: false, message: insErr.message };
  }

  return {
    ok: true,
    criado: true,
    id: criado?.id || null,
    message: "Espelho de transparencia_editais criado (rascunho).",
  };
}

export async function garantirPrestacoesDoEdital(
  editalId: string
): Promise<PonteResultado> {
  if (!isUuid(editalId)) {
    return { ok: false, message: "edital_id invalido." };
  }

  const { data: convenios, error } = await supabaseAdmin
    .from("transparencia_convenios")
    .select("id")
    .eq("edital_id", editalId);

  if (error) return { ok: false, message: error.message };
  if (!convenios?.length) {
    return {
      ok: true,
      message: "Nenhum convenio do edital para gerar prestacao.",
    };
  }

  let criados = 0;
  for (const c of convenios) {
    const r = await criarPrestacaoRascunhoDeConvenio(c.id);
    if (!r.ok) return r;
    if (r.criado) criados += 1;
  }

  return {
    ok: true,
    criado: criados > 0,
    message: `Prestacoes: ${criados} rascunho(s) novo(s).`,
  };
}
