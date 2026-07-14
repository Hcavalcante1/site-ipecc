import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isModalidadeCotacaoPrevia } from "@/lib/editais/tiposAdmin";
import { labelFaseAdmin } from "@/lib/editais/fasesAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import { registrarLog } from "@/lib/documentos/documentsService";
import {
  criarAssinaturaDocumento,
  documentoConfigurado,
} from "@/lib/documentos/signatureService";
import { ipeccConfigurado } from "@/lib/documentos/signature/IpeccProvider";
import { IPECC_PROVIDER_CODE } from "@/lib/documentos/signing/constants";
import { espelharDocumentoGovernanca } from "@/lib/transparencia/ponteCiclo";
import { obterTipoPublicacaoPadrao } from "@/lib/editais/documentosTipos";
import { renderPdfOficial } from "./renderPdf";
import {
  labelTipoEmissao,
  type SignatarioInput,
  type TipoEmissaoOficial,
} from "./types";

function modalidadeCompativel(
  tipo: string,
  tipoEdital: string | null | undefined
): boolean {
  const cotacao = isModalidadeCotacaoPrevia(tipoEdital);
  if (tipo === "edital_cotacao") return cotacao;
  if (tipo === "edital_chamamento") {
    const t = String(tipoEdital || "").toLowerCase();
    return t.includes("chamamento") || (!cotacao && t.includes("edital"));
  }
  return true;
}

export async function listarEmissoesDoEdital(editalId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("documentos_oficiais_emissoes")
    .select(
      "id, edital_id, tipo_emissao, tipo_publicacao, titulo, status, gd_document_id, signature_document_id, documento_publico_id, arquivo_url_publico, error_message, created_at, publicado_em"
    )
    .eq("edital_id", editalId)
    .order("created_at", { ascending: false });
}

export async function modelosDisponiveisParaEdital(opts: {
  tipoEdital?: string | null;
  faseAtual?: string | null;
}) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("documentos_oficiais_modelos")
    .select(
      "id, slug, titulo, tipo_emissao, tipo_publicacao, modalidade, fase_minima, ativo"
    )
    .eq("ativo", true)
    .order("titulo");

  if (error) return { data: null, error };

  const filtered = (data || []).filter((m) => {
    if (!modalidadeCompativel(m.tipo_emissao, opts.tipoEdital)) return false;
    return true;
  });

  return { data: filtered, error: null };
}

/** Inicia: gera PDF → GD → assinatura Documento (ainda sem publicar no site). */
export async function iniciarGerarAssinarPublicar(opts: {
  editalId: string;
  tipoEmissao: TipoEmissaoOficial;
  signatario: SignatarioInput;
  userId: string;
  actorEmail?: string | null;
  /** eu_assino = admin assina no painel; enviar_signatarios = e-mail externo. */
  modo?: "eu_assino" | "enviar_signatarios";
}) {
  if (!ipeccConfigurado() && !documentoConfigurado()) {
    return {
      ok: false as const,
      error:
        "Nenhum motor de assinatura disponível. O padrão é Assinatura Eletrônica IPECC (interno).",
    };
  }

  const modo =
    opts.modo === "eu_assino" ? "eu_assino" : "enviar_signatarios";

  let email = opts.signatario.email.trim().toLowerCase();
  let nome = opts.signatario.nome.trim() || email;

  if (modo === "eu_assino") {
    const actor = String(opts.actorEmail || "").trim().toLowerCase();
    if (!actor || !actor.includes("@")) {
      return {
        ok: false as const,
        error:
          "Não foi possível identificar o e-mail do usuário logado para assinar no admin.",
      };
    }
    email = actor;
    nome = opts.signatario.nome.trim() || actor.split("@")[0] || actor;
  } else if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Informe e-mail válido do signatário." };
  }

  const admin = getSupabaseAdmin();

  const { data: edital, error: edErr } = await admin
    .from("editais")
    .select(
      "id, titulo, descricao, tipo, periodo, periodo_envio, fase_atual, processo_id, status"
    )
    .eq("id", opts.editalId)
    .maybeSingle();

  if (edErr || !edital) {
    return { ok: false as const, error: edErr?.message || "Edital não encontrado." };
  }

  if (!modalidadeCompativel(opts.tipoEmissao, edital.tipo)) {
    return {
      ok: false as const,
      error: "Este modelo não é compatível com a modalidade do edital.",
    };
  }

  const { data: modelo } = await admin
    .from("documentos_oficiais_modelos")
    .select("id, titulo, tipo_emissao, tipo_publicacao, corpo_texto, ativo")
    .eq("tipo_emissao", opts.tipoEmissao)
    .eq("ativo", true)
    .maybeSingle();

  if (!modelo?.corpo_texto) {
    return {
      ok: false as const,
      error:
        "Modelo oficial ausente. Aplique docs/sql/documentos-oficiais-fase1.sql no Supabase.",
    };
  }

  const { data: propostas } = await admin
    .from("propostas")
    .select("nome, status, cnpj, categoria")
    .eq("edital_id", opts.editalId)
    .order("criado_em", { ascending: false })
    .limit(40);

  const listaPropostas =
    (propostas || [])
      .map(
        (p, i) =>
          `${i + 1}. ${p.nome || "Proponente"}${p.cnpj ? ` (CNPJ ${p.cnpj})` : ""}${
            p.status ? ` — ${p.status}` : ""
          }`
      )
      .join("\n") || "Nenhuma proposta cadastrada neste edital.";

  const dados = {
    titulo: String(edital.titulo || "Edital").trim(),
    tipo: String(edital.tipo || "").trim(),
    objeto: String(edital.descricao || edital.titulo || "").trim(),
    periodo: String(edital.periodo || "—").trim(),
    periodo_envio: String(edital.periodo_envio || edital.periodo || "—").trim(),
    fase: labelFaseAdmin(edital.fase_atual, edital.tipo),
    data: new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    propostas: listaPropostas,
  };

  const pdfBytes = await renderPdfOficial({
    tituloModelo: modelo.titulo,
    corpoTemplate: modelo.corpo_texto,
    dados,
  });
  const buffer = Buffer.from(pdfBytes);
  const hash = createHash("sha256").update(buffer).digest("hex");

  const tituloDoc = `${labelTipoEmissao(opts.tipoEmissao)} — ${dados.titulo}`.slice(
    0,
    200
  );
  const processoId = edital.processo_id || null;

  const { data: gdDoc, error: gdErr } = await admin
    .from("gd_documents")
    .insert({
      title: tituloDoc,
      description: `Emissão oficial automática do edital ${opts.editalId}`,
      processo_id: processoId,
      status: "ready_to_sign",
      current_version: 1,
      mime_type: "application/pdf",
      file_name: `${opts.tipoEmissao}.pdf`,
      file_size: buffer.length,
      file_hash: hash,
      created_by: opts.userId,
    })
    .select("id, processo_id, title, current_version")
    .single();

  if (gdErr || !gdDoc) {
    return {
      ok: false as const,
      error:
        gdErr?.message ||
        "Falha ao criar documento na Gestão Documental. Verifique o módulo documentos.",
    };
  }

  const storagePath = `${processoId || "geral"}/${gdDoc.id}/v1-${opts.tipoEmissao}.pdf`;
  const up = await admin.storage.from(GD_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up.error) {
    await admin.from("gd_documents").delete().eq("id", gdDoc.id);
    return {
      ok: false as const,
      error: up.error.message.includes("bucket")
        ? "Bucket gestao-documental ausente. Aplique o SQL do bucket da GD."
        : up.error.message,
    };
  }

  await admin
    .from("gd_documents")
    .update({
      storage_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gdDoc.id);

  const { data: version, error: verErr } = await admin
    .from("gd_document_versions")
    .insert({
      document_id: gdDoc.id,
      version_number: 1,
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_name: `${opts.tipoEmissao}.pdf`,
      file_size: buffer.length,
      file_hash: hash,
      change_note: "Geração automática (documentos oficiais)",
      created_by: opts.userId,
    })
    .select("id")
    .single();

  if (verErr || !version) {
    return {
      ok: false as const,
      error: verErr?.message || "Falha ao registrar versão do documento.",
    };
  }

  await registrarLog({
    processo_id: processoId,
    document_id: gdDoc.id,
    action: "criado",
    detail: { origem: "documentos_oficiais", edital_id: opts.editalId },
    actor_id: opts.userId,
    actor_email: opts.actorEmail,
  });

  const tipoPub =
    modelo.tipo_publicacao ||
    (await obterTipoPublicacaoPadrao(opts.tipoEmissao));

  const { data: emissao, error: emErr } = await admin
    .from("documentos_oficiais_emissoes")
    .insert({
      edital_id: opts.editalId,
      tipo_emissao: opts.tipoEmissao,
      tipo_publicacao: tipoPub,
      titulo: tituloDoc,
      status: "gerado",
      gd_document_id: gdDoc.id,
      gd_version_id: version.id,
      storage_path_gerado: storagePath,
      created_by: opts.userId,
    })
    .select("id")
    .single();

  if (emErr || !emissao) {
    return {
      ok: false as const,
      error:
        emErr?.message ||
        "Tabela de emissões ausente. Aplique docs/sql/documentos-oficiais-fase1.sql.",
    };
  }

  const sig = await criarAssinaturaDocumento({
    documentId: gdDoc.id,
    versionId: version.id,
    userId: opts.userId,
    actorEmail: opts.actorEmail,
    processoId,
    signerEmail: email,
    signerName: nome,
    providerCode: ipeccConfigurado()
      ? IPECC_PROVIDER_CODE
      : "documento",
    distribute: !ipeccConfigurado(),
    modo,
  });

  if (sig.error || !sig.data) {
    await admin
      .from("documentos_oficiais_emissoes")
      .update({
        status: "erro_assinatura",
        error_message:
          (sig.error as { message?: string } | null)?.message ||
          "Falha ao iniciar assinatura.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", emissao.id);
    return {
      ok: false as const,
      error:
        (sig.error as { message?: string } | null)?.message ||
        "Falha ao enviar para assinatura.",
    };
  }

  await admin
    .from("documentos_oficiais_emissoes")
    .update({
      status: "aguardando_assinatura",
      signature_document_id: sig.data.id,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emissao.id);

  return {
    ok: true as const,
    emissaoId: emissao.id,
    gdDocumentId: gdDoc.id,
    signatureDocumentId: sig.data.id,
    signingUrl: sig.signingUrl ?? null,
    embedUrl: sig.embedUrl ?? null,
    modo,
    aviso:
      modo === "eu_assino"
        ? "Documento gerado. Assine agora no painel; a publicação no edital ocorre automaticamente após a assinatura."
        : "Documento gerado e enviado para assinatura. Será publicado na página pública do edital automaticamente quando a assinatura for concluída.",
  };
}

/**
 * Chamado após assinatura Documento concluída.
 * Publica em documentos_publicos (publicado=true) e espelha transparência.
 */
export async function publicarEmissaoAposAssinatura(opts: {
  gdDocumentId: string;
  signedStoragePath: string;
}) {
  const admin = getSupabaseAdmin();

  const { data: emissao } = await admin
    .from("documentos_oficiais_emissoes")
    .select("*")
    .eq("gd_document_id", opts.gdDocumentId)
    .in("status", ["aguardando_assinatura", "assinado", "erro_publicacao"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!emissao) {
    return { ok: true as const, skipped: true };
  }

  if (emissao.status === "publicado" && emissao.documento_publico_id) {
    return { ok: true as const, skipped: true };
  }

  await admin
    .from("documentos_oficiais_emissoes")
    .update({
      status: "assinado",
      storage_path_assinado: opts.signedStoragePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emissao.id);

  try {
    const { data: signedFile, error: dlErr } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .download(opts.signedStoragePath);
    if (dlErr || !signedFile) {
      throw new Error(dlErr?.message || "PDF assinado não encontrado no storage.");
    }

    const bytes = Buffer.from(await signedFile.arrayBuffer());
    const publicPath = `governanca-editais/${emissao.edital_id}/${Date.now()}-${emissao.tipo_emissao}-assinado.pdf`;

    const up = await admin.storage.from("docs").upload(publicPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up.error) {
      throw new Error(up.error.message);
    }

    const now = new Date().toISOString();
    let docPublicoId = emissao.documento_publico_id as string | null;

    if (docPublicoId) {
      const { error } = await admin
        .from("documentos_publicos")
        .update({
          titulo: emissao.titulo,
          arquivo_url: publicPath,
          publicado: true,
          publicado_em: now,
          tipo: emissao.tipo_publicacao,
        })
        .eq("id", docPublicoId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await admin
        .from("documentos_publicos")
        .insert({
          edital_id: emissao.edital_id,
          tipo: emissao.tipo_publicacao,
          titulo: emissao.titulo,
          descricao: "Documento oficial gerado, assinado e publicado automaticamente.",
          arquivo_url: publicPath,
          publicado: true,
          publicado_em: now,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message || "Falha ao publicar.");
      docPublicoId = inserted.id;
    }

    if (
      emissao.tipo_publicacao === "edital" ||
      emissao.tipo_emissao === "edital_cotacao" ||
      emissao.tipo_emissao === "edital_chamamento"
    ) {
      await admin
        .from("editais")
        .update({
          arquivo_pdf: publicPath,
          updated_at: now,
        })
        .eq("id", emissao.edital_id);
    }

    await admin
      .from("documentos_oficiais_emissoes")
      .update({
        status: "publicado",
        documento_publico_id: docPublicoId,
        arquivo_url_publico: publicPath,
        publicado_em: now,
        error_message: null,
        updated_at: now,
      })
      .eq("id", emissao.id);

    await espelharDocumentoGovernanca(emissao.edital_id, {
      tipo: emissao.tipo_publicacao,
      titulo: emissao.titulo,
      arquivo_url: publicPath,
    }).catch(() => null);

    revalidatePath(`/editais/${emissao.edital_id}`);
    revalidatePath("/editais");
    revalidatePath("/transparencia");

    return { ok: true as const, documentoPublicoId: docPublicoId, path: publicPath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("documentos_oficiais_emissoes")
      .update({
        status: "erro_publicacao",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", emissao.id);
    return { ok: false as const, error: msg };
  }
}
