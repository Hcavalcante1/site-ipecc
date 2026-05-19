"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { adminTokens } from "@/components/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatarTipoPessoa(tipo?: string) {
  if (tipo === "pessoa_juridica") return "Pessoa Jurídica";
  if (tipo === "osc") return "OSC";
  if (tipo === "pessoa_fisica") return "Pessoa Física";
  if (tipo === "empresa") return "Pessoa Jurídica";
  if (tipo === "pf") return "Pessoa Física";
  return tipo || "—";
}

function formatarCategoria(categoria?: string | null, mensagem?: string) {
  if (mensagem) {
    const envioCompleto = mensagem
      .split("\n")
      .some((item) =>
        item.trim().toLowerCase().includes("envio completo com múltiplas categorias")
      );
    if (envioCompleto) {
      return "Envio completo (múltiplas categorias documentais)";
    }
  }

  if (categoria === "habilitacao_juridica") return "Habilitação Jurídica";
  if (categoria === "regularidade_fiscal_trabalhista") {
    return "Regularidade Fiscal e Trabalhista";
  }
  if (categoria === "qualificacao_tecnica") return "Qualificação Técnica";

  if (!mensagem) return "—";

  const linha = mensagem
    .split("\n")
    .find((item) => item.trim().toLowerCase().startsWith("categoria:"));

  if (!linha) return "—";

  return linha.replace(/^categoria:\s*/i, "").trim() || "—";
}

function extrairMensagemPrincipal(mensagem?: string) {
  if (!mensagem) return "—";

  const linhas = mensagem
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !l.toLowerCase().startsWith("tipo de pessoa:") &&
        !l.toLowerCase().startsWith("categoria:") &&
        !l.toLowerCase().startsWith("anexos enviados:") &&
        !l.toLowerCase().startsWith("anexos enviados —") &&
        !l.toLowerCase().startsWith("anexos complementares:") &&
        !l.toLowerCase().startsWith("envio completo com múltiplas categorias")
    );

  return linhas.length ? linhas.join("\n") : "—";
}

type GrupoChecklistId =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica"
  | "outros";

type ItemChecklistDocumental = {
  key: string;
  label: string;
  path: string | null;
  origem: "coluna" | "mensagem";
};

const GRUPOS_CHECKLIST: { id: GrupoChecklistId; titulo: string }[] = [
  { id: "habilitacao_juridica", titulo: "Habilitação jurídica e institucional" },
  {
    id: "regularidade_fiscal_trabalhista",
    titulo: "Regularidade fiscal e trabalhista",
  },
  { id: "qualificacao_tecnica", titulo: "Qualificação técnica e operacional" },
  { id: "outros", titulo: "Outros anexos / documentos complementares" },
];

const CHAVES_POR_GRUPO: Record<GrupoChecklistId, string[]> = {
  habilitacao_juridica: [
    "proposta",
    "contrato_social",
    "estatuto",
    "ata_posse",
    "cnpj",
    "doc_representante",
    "doc_pessoal",
    "cpf",
    "comprovante_residencia",
    "procuracao",
    "declaracao_consolidada_edital",
    "declaracao_ciencia_edital",
    "alvara",
  ],
  regularidade_fiscal_trabalhista: [
    "certidao_federal",
    "certidao_estadual",
    "certidao_municipal",
    "fgts",
    "cndt",
    "certidao_falencia",
    "certidao_inss",
    "certidao_tce",
    "certidao_tcu",
    "certidao_cnciai",
    "cadin",
  ],
  qualificacao_tecnica: [
    "plano_trabalho",
    "portfolio",
    "atestado_tecnico",
    "qualificacao_tecnica",
    "equipe_tecnica",
    "relatorios",
    "formacao",
    "registro_profissional",
    "balanco_patrimonial",
    "demonstracoes_financeiras",
    "crea_art",
    "licenca_sanitaria",
    "licenca_ambiental",
    "cat",
    "indices_financeiros",
    "declaracao_capacidade",
  ],
  outros: [],
};

const LABEL_INSTITUCIONAL_POR_CHAVE: Record<string, string> = {
  proposta: "Formulário de Inscrição / Proposta",
  contrato_social: "Contrato Social Consolidado e Alterações Contratuais Registradas",
  estatuto: "Estatuto Social Consolidado e Registrado em Cartório",
  ata_posse: "Ata de Eleição e Posse da Diretoria Vigente",
  cnpj: "Comprovante de Inscrição e Situação Cadastral do CNPJ",
  doc_representante:
    "Cópia de Documento de Identidade e CPF do Representante Legal",
  doc_pessoal: "Documento Oficial de Identificação com Foto",
  cpf: "Cadastro de Pessoa Física — CPF",
  comprovante_residencia: "Comprovante de Residência",
  procuracao: "Procuração com Poderes Específicos para o Certame",
  declaracao_consolidada_edital: "Declaração Consolidada de Atendimento ao Edital",
  declaracao_ciencia_edital:
    "Declaração de Ciência, Concordância e Atendimento ao Edital",
  alvara: "Alvará de Funcionamento",
  certidao_federal:
    "Certidão Negativa de Débitos Relativos aos Tributos Federais e à Dívida Ativa da União",
  certidao_estadual: "Certidão de Regularidade Fiscal Estadual",
  certidao_municipal: "Certidão de Regularidade Fiscal Municipal",
  fgts: "Certificado de Regularidade do FGTS — CRF",
  cndt: "Certidão Negativa de Débitos Trabalhistas — CNDT",
  certidao_falencia: "Certidão Negativa de Falência e Recuperação Judicial",
  plano_trabalho: "Plano de Trabalho",
  portfolio: "Portfólio / Catálogo de Realizações Anteriores",
  atestado_tecnico: "Atestado de Capacidade Técnica em Objeto Similar",
  qualificacao_tecnica: "Documentos de Qualificação Técnica",
  equipe_tecnica: "Relação de Equipe Técnica e Responsáveis",
  relatorios: "Relatórios de Execução / Prestação Anterior",
  formacao: "Certificados de Formação e Capacitação",
  registro_profissional: "Registro Profissional em Conselho de Classe",
  balanco_patrimonial: "Balanço Patrimonial do Último Exercício Social",
  demonstracoes_financeiras: "Demonstrações Contábeis",
  crea_art: "CREA / ART / RRT do Responsável Técnico",
  licenca_sanitaria: "Licença Sanitária",
  licenca_ambiental: "Licença Ambiental",
  declaracao_capacidade:
    "Declaração de Capacidade Técnica e Institucional",
};

const COLUNA_URL_POR_CHAVE: Record<string, string> = {
  proposta: "arquivo_url",
  cnpj: "cnpj_url",
  contrato_social: "contrato_social_url",
  estatuto: "estatuto_url",
  ata_posse: "ata_posse_url",
  doc_pessoal: "doc_pessoal_url",
  doc_representante: "doc_representante_url",
  procuracao: "procuracao_url",
  certidao_federal: "certidao_federal_url",
  certidao_estadual: "certidao_estadual_url",
  certidao_municipal: "certidao_municipal_url",
  fgts: "fgts_url",
  cndt: "cndt_url",
  atestado_tecnico: "atestado_tecnico_url",
  qualificacao_tecnica: "qualificacao_tecnica_url",
  equipe_tecnica: "equipe_tecnica_url",
  portfolio: "portfolio_url",
  formacao: "formacao_url",
  registro_profissional: "registro_profissional_url",
  comprovante_residencia: "comprovante_residencia_url",
  cpf: "cpf_url",
};

function labelInstitucionalDocumento(chave: string) {
  if (LABEL_INSTITUCIONAL_POR_CHAVE[chave]) {
    return LABEL_INSTITUCIONAL_POR_CHAVE[chave];
  }
  return chave.replace(/_/g, " ");
}

function grupoPorChave(chave: string): GrupoChecklistId {
  const normalizada = chave.trim().toLowerCase();
  for (const grupo of GRUPOS_CHECKLIST) {
    if (grupo.id === "outros") continue;
    if (CHAVES_POR_GRUPO[grupo.id].includes(normalizada)) {
      return grupo.id;
    }
  }
  return "outros";
}

function grupoPorTituloSecao(titulo: string): GrupoChecklistId | null {
  const t = titulo.toLowerCase();
  if (t.includes("habilitação") || t.includes("habilitacao") || t.includes("institucional")) {
    return "habilitacao_juridica";
  }
  if (t.includes("regularidade") || t.includes("fiscal") || t.includes("trabalhista")) {
    return "regularidade_fiscal_trabalhista";
  }
  if (t.includes("qualificação") || t.includes("qualificacao") || t.includes("operacional")) {
    return "qualificacao_tecnica";
  }
  return null;
}

function parseParesAnexos(texto: string) {
  return texto
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [chave, ...resto] = item.split(":");
      return {
        chave: (chave || "").trim().toLowerCase(),
        valor: resto.join(":").trim(),
      };
    })
    .filter((item) => item.chave);
}

function extrairAnexosDaMensagem(mensagem?: string) {
  const porGrupo: Record<GrupoChecklistId, Map<string, ItemChecklistDocumental>> = {
    habilitacao_juridica: new Map(),
    regularidade_fiscal_trabalhista: new Map(),
    qualificacao_tecnica: new Map(),
    outros: new Map(),
  };

  if (!mensagem) return porGrupo;

  const linhas = mensagem.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const linha of linhas) {
    const matchSecao = linha.match(/^anexos enviados\s*[—–-]\s*(.+?):\s*(.+)$/i);
    if (matchSecao) {
      const tituloSecao = matchSecao[1].trim();
      const conteudo = matchSecao[2].trim();
      const grupo =
        grupoPorTituloSecao(tituloSecao) ?? grupoPorChave(parseParesAnexos(conteudo)[0]?.chave || "");

      parseParesAnexos(conteudo).forEach(({ chave, valor }) => {
        const grupoFinal = grupoPorChave(chave) !== "outros" ? grupoPorChave(chave) : grupo;
        porGrupo[grupoFinal].set(chave, {
          key: chave,
          label: labelInstitucionalDocumento(chave),
          path: valor || null,
          origem: "mensagem",
        });
      });
      continue;
    }

    if (linha.toLowerCase().startsWith("anexos enviados:")) {
      const conteudo = linha.replace(/^anexos enviados:\s*/i, "").trim();
      parseParesAnexos(conteudo).forEach(({ chave, valor }) => {
        const grupo = grupoPorChave(chave);
        porGrupo[grupo].set(chave, {
          key: chave,
          label: labelInstitucionalDocumento(chave),
          path: valor || null,
          origem: "mensagem",
        });
      });
    }
  }

  return porGrupo;
}

function mesclarColunasProposta(
  proposta: Record<string, unknown>,
  porGrupo: Record<GrupoChecklistId, Map<string, ItemChecklistDocumental>>
) {
  Object.entries(COLUNA_URL_POR_CHAVE).forEach(([chave, coluna]) => {
    const path = proposta[coluna];
    if (typeof path !== "string" || !path.trim()) return;

    const grupo = grupoPorChave(chave);
    const existente = porGrupo[grupo].get(chave);
    porGrupo[grupo].set(chave, {
      key: chave,
      label: labelInstitucionalDocumento(chave),
      path: path.trim(),
      origem: existente?.origem === "mensagem" ? "mensagem" : "coluna",
    });
  });
}

function montarChecklistDocumental(
  proposta: Record<string, unknown> | null,
  mensagem?: string
) {
  const porGrupo = extrairAnexosDaMensagem(mensagem);
  if (proposta) {
    mesclarColunasProposta(proposta, porGrupo);
  }

  return GRUPOS_CHECKLIST.map((grupo) => ({
    ...grupo,
    itens: Array.from(porGrupo[grupo.id].values()).sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR")
    ),
  }));
}

type CertidaoEntidade = {
  id: string;
  tipo_id: string;
  orgao_emissor: string;
  esfera: string;
  validade_ate: string;
  status: string;
  versao: number;
};

type CertidaoEntidadeLinha = CertidaoEntidade & {
  tipo_nome: string;
};

function formatarDataCertidao(iso: string) {
  const date = new Date(iso + "T12:00:00");
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

function situacaoValidadeCertidao(validadeAte: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(validadeAte + "T12:00:00");
  const dias = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) {
    return { texto: "Vencida", cor: "#f97316" };
  }
  return { texto: "Válida", cor: "#22c55e" };
}

type StatusDocumentalAuto =
  | "documentacao_completa"
  | "documentacao_pendente"
  | "documentacao_irregular"
  | "em_analise";

type DiagnosticoDocumental = {
  status: StatusDocumentalAuto;
  statusLabel: string;
  nucleoEncontrados: number;
  nucleoTotal: number;
  listaVerde: string[];
  listaLaranja: string[];
  listaVermelha: string[];
  alertasCertidoes: string[];
};

const LABEL_STATUS_DOCUMENTAL: Record<StatusDocumentalAuto, string> = {
  documentacao_completa: "Documentação completa",
  documentacao_pendente: "Documentação pendente",
  documentacao_irregular: "Documentação irregular",
  em_analise: "Em análise",
};

const CORES_STATUS_DOCUMENTAL: Record<
  StatusDocumentalAuto,
  { bg: string; border: string; color: string }
> = {
  documentacao_completa: {
    bg: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.35)",
    color: "#86efac",
  },
  documentacao_pendente: {
    bg: "rgba(249,115,22,0.12)",
    border: "1px solid rgba(249,115,22,0.35)",
    color: "#fdba74",
  },
  documentacao_irregular: {
    bg: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
  },
  em_analise: {
    bg: "rgba(234,179,8,0.12)",
    border: "1px solid rgba(234,179,8,0.35)",
    color: "#fde047",
  },
};

const NUCLEO_POR_TIPO: Record<
  "pessoa_juridica" | "osc" | "pessoa_fisica",
  string[]
> = {
  pessoa_fisica: ["proposta", "doc_pessoal", "cpf"],
  osc: [
    "proposta",
    "estatuto",
    "ata_posse",
    "cnpj",
    "doc_representante",
    "certidao_federal",
    "fgts",
    "cndt",
    "plano_trabalho",
  ],
  pessoa_juridica: [
    "proposta",
    "contrato_social",
    "cnpj",
    "doc_representante",
    "certidao_federal",
    "fgts",
    "cndt",
  ],
};

const CHAVES_CERTIDAO_NUCLEO = ["certidao_federal", "fgts", "cndt"];

const PADROES_TIPO_CERTIDAO: Record<string, string[]> = {
  certidao_federal: ["federal", "rfb", "pgfn", "união", "uniao", "tributos"],
  fgts: ["fgts", "crf"],
  cndt: ["cndt", "trabalhist"],
};

function normalizarTipoProposta(
  tipo?: string
): "pessoa_juridica" | "osc" | "pessoa_fisica" {
  if (tipo === "osc") return "osc";
  if (tipo === "pessoa_fisica" || tipo === "pf") return "pessoa_fisica";
  return "pessoa_juridica";
}

function chavesEnviadasProposta(
  proposta: Record<string, unknown> | null,
  checklist: ReturnType<typeof montarChecklistDocumental>
) {
  const keys = new Set<string>();
  checklist.forEach((grupo) => {
    grupo.itens.forEach((item) => keys.add(item.key));
  });
  if (typeof proposta?.arquivo_url === "string" && proposta.arquivo_url.trim()) {
    keys.add("proposta");
  }
  return keys;
}

function chavesCondicionaisPorTipo(tipo: "pessoa_juridica" | "osc" | "pessoa_fisica") {
  const nucleo = new Set(NUCLEO_POR_TIPO[tipo]);
  const todas = (
    [
      ...CHAVES_POR_GRUPO.habilitacao_juridica,
      ...CHAVES_POR_GRUPO.regularidade_fiscal_trabalhista,
      ...CHAVES_POR_GRUPO.qualificacao_tecnica,
      ...CHAVES_POR_GRUPO.outros,
    ] as string[]
  ).filter((chave, index, arr) => arr.indexOf(chave) === index);

  return todas.filter((chave) => !nucleo.has(chave));
}

function certidaoAssociadaChave(
  chave: string,
  certidoes: CertidaoEntidadeLinha[]
) {
  const padroes = PADROES_TIPO_CERTIDAO[chave] || [];
  return certidoes.find((cert) => {
    const ref = `${cert.tipo_nome} ${cert.orgao_emissor}`.toLowerCase();
    return padroes.some((padrao) => ref.includes(padrao));
  });
}

function certidaoEstaIrregular(cert: CertidaoEntidadeLinha) {
  if (
    cert.status === "irregular" ||
    cert.status === "positiva" ||
    cert.status === "positiva_com_efeito_negativa" ||
    cert.status === "vencida"
  ) {
    return true;
  }
  return situacaoValidadeCertidao(cert.validade_ate).texto === "Vencida";
}

function calcularDiagnosticoDocumental(
  proposta: Record<string, unknown> | null,
  tipoRaw: string | undefined,
  checklist: ReturnType<typeof montarChecklistDocumental>,
  certidoes: CertidaoEntidadeLinha[],
  cnpjDigitos: string
): DiagnosticoDocumental {
  const tipo = normalizarTipoProposta(tipoRaw);
  const nucleo = NUCLEO_POR_TIPO[tipo];
  const enviadas = chavesEnviadasProposta(proposta, checklist);
  const podeCruzarCertidoes = cnpjDigitos.length === 14;

  const listaVerde: string[] = [];
  const listaLaranja: string[] = [];
  const listaVermelha: string[] = [];
  const alertasCertidoes: string[] = [];

  nucleo.forEach((chave) => {
    if (enviadas.has(chave)) {
      listaVerde.push(labelInstitucionalDocumento(chave));
    } else {
      listaVermelha.push(
        `Falta no envio (núcleo): ${labelInstitucionalDocumento(chave)}`
      );
    }
  });

  if (podeCruzarCertidoes) {
    CHAVES_CERTIDAO_NUCLEO.forEach((chave) => {
      if (!nucleo.includes(chave)) return;

      const enviado = enviadas.has(chave);
      const cert = certidaoAssociadaChave(chave, certidoes);

      if (!enviado && !cert) {
        listaVermelha.push(
          `${labelInstitucionalDocumento(chave)}: ausente no envio e no cadastro institucional (CNPJ)`
        );
      }

      if (cert) {
        const validade = situacaoValidadeCertidao(cert.validade_ate);
        if (certidaoEstaIrregular(cert)) {
          const alerta = `${cert.tipo_nome}: vencida ou irregular (validade ${formatarDataCertidao(cert.validade_ate)} — ${validade.texto})`;
          alertasCertidoes.push(alerta);
          listaVermelha.push(`Pendência grave: ${alerta}`);
        } else if (!enviado) {
          alertasCertidoes.push(
            `${cert.tipo_nome}: cadastrada no IPECC (válida até ${formatarDataCertidao(cert.validade_ate)}), não anexada na proposta`
          );
        }
      }
    });
  }

  chavesCondicionaisPorTipo(tipo).forEach((chave) => {
    if (!enviadas.has(chave)) {
      listaLaranja.push(
        `Condicional não enviado: ${labelInstitucionalDocumento(chave)}`
      );
    }
  });

  const nucleoEncontrados = nucleo.filter((chave) => enviadas.has(chave)).length;
  const nucleoTotal = nucleo.length;
  const faltaNucleo = nucleoEncontrados < nucleoTotal;
  const irregularCertidao = listaVermelha.some((item) =>
    item.toLowerCase().includes("vencida ou irregular")
  );

  let status: StatusDocumentalAuto;
  if (faltaNucleo) {
    status = "documentacao_pendente";
  } else if (irregularCertidao) {
    status = "documentacao_irregular";
  } else if (listaLaranja.length > 0) {
    status = "em_analise";
  } else {
    status = "documentacao_completa";
  }

  return {
    status,
    statusLabel: LABEL_STATUS_DOCUMENTAL[status],
    nucleoEncontrados,
    nucleoTotal,
    listaVerde,
    listaLaranja,
    listaVermelha,
    alertasCertidoes,
  };
}

function ListaDiagnostico({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: string;
}) {
  if (itens.length === 0) return null;

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: cor,
        }}
      >
        {titulo}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: cor, lineHeight: 1.5 }}>
        {itens.map((item) => (
          <li key={item} style={{ marginBottom: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
};

function somenteDigitosCnpj(valor?: string | null) {
  if (!valor) return "";
  return valor.replace(/\D/g, "");
}

function labelCampoCertidao(value: string) {
  return value.replace(/_/g, " ");
}

function extrairResumoAnexos(mensagem?: string) {
  if (!mensagem) return [];

  const linha = mensagem
    .split("\n")
    .find(
      (item) =>
        item.trim().toLowerCase().startsWith("anexos enviados:") ||
        item.trim().toLowerCase().startsWith("anexos complementares:")
    );

  if (!linha) return [];

  const texto = linha
    .replace(/^anexos enviados:\s*/i, "")
    .replace(/^anexos complementares:\s*/i, "")
    .trim();

  if (!texto) return [];

  return texto
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [chave, ...resto] = item.split(":");
      return {
        chave: (chave || "").trim(),
        valor: resto.join(":").trim(),
      };
    });
}

const gap20 = adminTokens.spacing.base + adminTokens.spacing.sm;
const borderLight = `1px solid ${adminTokens.colors.border.light}`;

function btn(bg: string, color: string) {
  return {
    background: bg,
    color,
    padding: adminTokens.sizes.button.medium.padding,
    borderRadius: adminTokens.sizes.button.medium.borderRadius,
    textDecoration: "none",
    fontWeight: adminTokens.typography.fontWeight.bold,
    fontSize: adminTokens.sizes.button.medium.fontSize,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    lineHeight: adminTokens.typography.lineHeight.normal,
  } as React.CSSProperties;
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        borderRadius: adminTokens.borderRadius.md,
        padding: adminTokens.sizes.card.mainPadding,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.sm * 2,
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.55,
        color: adminTokens.colors.text.secondary,
      }}
    >
      <strong
        style={{
          color: adminTokens.colors.text.primary,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </strong>{" "}
      {value}
    </p>
  );
}

function BadgeCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue";
}) {
  const palette =
    tone === "green"
      ? {
          bg: "rgba(34,197,94,0.10)",
          border: "1px solid rgba(34,197,94,0.22)",
          label: "#86efac",
        }
      : {
          bg: "rgba(59,130,246,0.10)",
          border: "1px solid rgba(59,130,246,0.22)",
          label: "#93c5fd",
        };

  return (
    <div
      style={{
        background: palette.bg,
        border: palette.border,
        borderRadius: 16,
        padding: adminTokens.spacing.lg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: palette.label,
          marginBottom: adminTokens.spacing.sm,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Page() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [proposta, setProposta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certidoesEntidade, setCertidoesEntidade] = useState<CertidaoEntidadeLinha[]>(
    []
  );
  const [carregandoCertidoes, setCarregandoCertidoes] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!id) return;

      const { data } = await supabase.from("propostas").select("*").eq("id", id);

      if (data && data.length > 0) {
        setProposta(data[0]);
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  const cnpjProposta = useMemo(
    () => somenteDigitosCnpj(proposta?.cnpj),
    [proposta?.cnpj]
  );

  useEffect(() => {
    async function carregarCertidoesEntidade() {
      if (!cnpjProposta || cnpjProposta.length !== 14) {
        setCertidoesEntidade([]);
        return;
      }

      setCarregandoCertidoes(true);

      const [certidoesRes, tiposRes] = await Promise.all([
        supabase
          .from("certidoes")
          .select(
            "id, tipo_id, orgao_emissor, esfera, validade_ate, status, versao"
          )
          .eq("organizacao_cnpj", cnpjProposta)
          .order("validade_ate", { ascending: true }),
        supabase
          .from("certidao_tipos")
          .select("id, codigo, nome")
          .eq("ativo", true),
      ]);

      if (certidoesRes.error || tiposRes.error) {
        setCertidoesEntidade([]);
        setCarregandoCertidoes(false);
        return;
      }

      const tiposMap = new Map<string, CertidaoTipo>();
      (tiposRes.data || []).forEach((tipo) => {
        tiposMap.set(tipo.id, tipo as CertidaoTipo);
      });

      const linhas: CertidaoEntidadeLinha[] = ((certidoesRes.data || []) as CertidaoEntidade[]).map(
        (item) => {
          const tipo = tiposMap.get(item.tipo_id);
          return {
            ...item,
            tipo_nome: tipo?.nome ?? "—",
          };
        }
      );

      setCertidoesEntidade(linhas);
      setCarregandoCertidoes(false);
    }

    if (proposta) {
      carregarCertidoesEntidade();
    }
  }, [proposta, cnpjProposta]);

  async function excluirProposta() {
    if (!confirm("Deseja excluir esta proposta?")) return;

    await supabase.from("propostas").delete().eq("id", id);
    router.push("/admin/propostas");
  }

  function url(caminho: string | null) {
    if (!caminho) return null;

    return `/api/download/public/propostas/${caminho}`;
  }

  const tipoPessoa = useMemo(
    () => formatarTipoPessoa(proposta?.tipo),
    [proposta?.tipo]
  );

  const categoria = useMemo(
    () => formatarCategoria(proposta?.categoria, proposta?.mensagem),
    [proposta?.categoria, proposta?.mensagem]
  );

  const mensagemPrincipal = useMemo(
    () => extrairMensagemPrincipal(proposta?.mensagem),
    [proposta?.mensagem]
  );

  const checklistDocumental = useMemo(
    () => montarChecklistDocumental(proposta, proposta?.mensagem),
    [proposta]
  );

  const totalItensChecklist = useMemo(
    () => checklistDocumental.reduce((acc, g) => acc + g.itens.length, 0),
    [checklistDocumental]
  );

  const resumoAnexos = useMemo(() => {
    const itensChecklist = checklistDocumental.flatMap((grupo) =>
      grupo.itens.map((item) => ({
        chave: item.key,
        valor: item.path || "—",
      }))
    );
    if (itensChecklist.length > 0) return itensChecklist;
    return extrairResumoAnexos(proposta?.mensagem);
  }, [checklistDocumental, proposta?.mensagem]);

  const diagnosticoDocumental = useMemo(
    () =>
      calcularDiagnosticoDocumental(
        proposta,
        proposta?.tipo,
        checklistDocumental,
        certidoesEntidade,
        cnpjProposta
      ),
    [proposta, checklistDocumental, certidoesEntidade, cnpjProposta]
  );

  const downloads = useMemo(() => {
    if (!proposta) return [];

    return [
      { label: "Proposta", path: proposta.arquivo_url, bg: "#22c55e", color: "#022c22" },
      { label: "CNPJ", path: proposta.cnpj_url, bg: "#3b82f6", color: "#fff" },
      { label: "Contrato Social", path: proposta.contrato_social_url, bg: "#a855f7", color: "#fff" },
      { label: "Estatuto", path: proposta.estatuto_url, bg: "#eab308", color: "#111827" },
      { label: "Ata e Posse", path: proposta.ata_posse_url, bg: "#8b5cf6", color: "#fff" },
      { label: "Documento Pessoal", path: proposta.doc_pessoal_url, bg: "#f97316", color: "#fff" },
      { label: "Documento Representante", path: proposta.doc_representante_url, bg: "#06b6d4", color: "#06283D" },
      { label: "Procuração", path: proposta.procuracao_url, bg: "#14b8a6", color: "#052e2b" },
      { label: "Certidão Federal", path: proposta.certidao_federal_url, bg: "#2563eb", color: "#fff" },
      { label: "Certidão Estadual", path: proposta.certidao_estadual_url, bg: "#4f46e5", color: "#fff" },
      { label: "Certidão Municipal", path: proposta.certidao_municipal_url, bg: "#7c3aed", color: "#fff" },
      { label: "FGTS", path: proposta.fgts_url, bg: "#16a34a", color: "#fff" },
      { label: "CNDT", path: proposta.cndt_url, bg: "#dc2626", color: "#fff" },
      { label: "Atestado Técnico", path: proposta.atestado_tecnico_url, bg: "#0891b2", color: "#fff" },
      { label: "Qualificação Técnica", path: proposta.qualificacao_tecnica_url, bg: "#0f766e", color: "#fff" },
      { label: "Equipe Técnica", path: proposta.equipe_tecnica_url, bg: "#1d4ed8", color: "#fff" },
      { label: "Portfólio", path: proposta.portfolio_url, bg: "#9333ea", color: "#fff" },
      { label: "Formação", path: proposta.formacao_url, bg: "#ea580c", color: "#fff" },
      { label: "Registro Profissional", path: proposta.registro_profissional_url, bg: "#475569", color: "#fff" },
      { label: "Comprovante de Residência", path: proposta.comprovante_residencia_url, bg: "#0ea5e9", color: "#fff" },
      { label: "CPF", path: proposta.cpf_url, bg: "#64748b", color: "#fff" },
    ].filter((item) => !!item.path);
  }, [proposta]);

  if (loading)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Carregando...</p>
    );
  if (!proposta)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Proposta não encontrada</p>
    );

  return (
    <div
      style={{
        padding: adminTokens.spacing.base + adminTokens.spacing.xl,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          background:
            "linear-gradient(180deg, rgba(16,63,124,0.92) 0%, rgba(2,6,23,0.98) 100%)",
          borderRadius: 28,
          padding: adminTokens.spacing.xxxl + adminTokens.spacing.base,
          color: "#e5e7eb",
          border: borderLight,
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
        }}
      >
        <div
          style={{
            marginBottom: adminTokens.spacing.xl + adminTokens.spacing.md,
            paddingBottom: adminTokens.spacing.xl,
            borderBottom: borderLight,
          }}
        >
          <h1
            style={{
              fontSize: 30,
              margin: 0,
              fontWeight: adminTokens.typography.fontWeight.bold,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Detalhe da Proposta
          </h1>

          <p
            style={{
              marginTop: adminTokens.spacing.md,
              marginBottom: 0,
              color: adminTokens.colors.text.muted,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Visualização completa dos dados enviados, com separação por tipo,
            categoria e anexos.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: gap20,
            alignItems: "start",
          }}
        >
          <InfoCard title="Dados da Proponente">
            <div style={{ display: "grid", gap: adminTokens.spacing.base }}>
              <LabelValue label="Nome:" value={proposta.nome || "—"} />
              <LabelValue label="Email:" value={proposta.email || "—"} />
              <LabelValue label="Telefone:" value={proposta.telefone || "—"} />
              <LabelValue label="Documento:" value={proposta.cnpj || "—"} />
            </div>
          </InfoCard>

          <InfoCard title="Classificação da Proposta">
            <div style={{ display: "grid", gap: adminTokens.spacing.lg }}>
              <BadgeCard
                label="Tipo de Pessoa"
                value={tipoPessoa}
                tone="green"
              />
              <BadgeCard
                label="Categoria"
                value={categoria}
                tone="blue"
              />
            </div>
          </InfoCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: gap20,
            marginTop: gap20,
          }}
        >
          <InfoCard title="Mensagem Principal">
            <div
              style={{
                whiteSpace: "pre-line",
                lineHeight: 1.65,
                color: adminTokens.colors.text.secondary,
                fontSize: 15,
              }}
            >
              {mensagemPrincipal}
            </div>
          </InfoCard>

          <InfoCard title="Resumo dos Anexos Informados">
            {resumoAnexos.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                —
              </span>
            ) : (
              <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
                {resumoAnexos.map((item, index) => (
                  <div
                    key={`${item.chave}-${index}`}
                    style={{
                      padding: adminTokens.sizes.input.padding,
                      borderRadius: adminTokens.borderRadius.sm,
                      background: adminTokens.colors.surface.subtle,
                      border: "1px solid rgba(148,163,184,0.10)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: adminTokens.typography.fontWeight.bold,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#93c5fd",
                        marginBottom: 4,
                      }}
                    >
                      {item.chave || "Anexo"}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: adminTokens.colors.text.secondary,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.valor || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Status documental (sugestão automática)">
            <p
              style={{
                marginTop: 0,
                marginBottom: adminTokens.spacing.base,
                color: adminTokens.colors.text.muted,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Status sugerido automaticamente. A decisão final cabe ao analista
              responsável.
            </p>
            <div
              style={{
                ...CORES_STATUS_DOCUMENTAL[diagnosticoDocumental.status],
                borderRadius: 16,
                padding: adminTokens.spacing.lg,
                marginBottom: adminTokens.spacing.lg,
                border: CORES_STATUS_DOCUMENTAL[diagnosticoDocumental.status].border,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: adminTokens.spacing.sm,
                  opacity: 0.9,
                }}
              >
                Status sugerido
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: adminTokens.typography.fontWeight.bold,
                  lineHeight: 1.25,
                }}
              >
                {diagnosticoDocumental.statusLabel}
              </div>
            </div>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                color: adminTokens.colors.text.secondary,
              }}
            >
              Núcleo documental: {diagnosticoDocumental.nucleoEncontrados}/
              {diagnosticoDocumental.nucleoTotal}
            </p>
            <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
              <ListaDiagnostico
                titulo="Documentos do núcleo encontrados"
                itens={diagnosticoDocumental.listaVerde}
                cor="#86efac"
              />
              <ListaDiagnostico
                titulo="Documentos condicionais ausentes"
                itens={diagnosticoDocumental.listaLaranja}
                cor="#fbbf24"
              />
              <ListaDiagnostico
                titulo="Pendências graves"
                itens={diagnosticoDocumental.listaVermelha}
                cor="#fca5a5"
              />
              <ListaDiagnostico
                titulo="Alertas de certidões (cadastro institucional)"
                itens={diagnosticoDocumental.alertasCertidoes}
                cor="#fdba74"
              />
            </div>
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Checklist documental da proposta">
            <p
              style={{
                marginTop: 0,
                marginBottom: adminTokens.spacing.base,
                color: adminTokens.colors.text.muted,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Checklist gerado a partir dos anexos informados no envio da proposta.
            </p>
            {totalItensChecklist === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhum anexo identificado na mensagem ou nas colunas da proposta.
              </span>
            ) : (
              <div style={{ display: "grid", gap: adminTokens.spacing.lg }}>
                {checklistDocumental.map((grupo) =>
                  grupo.itens.length === 0 ? null : (
                    <div key={grupo.id} style={{ marginBottom: adminTokens.spacing.lg }}>
                      <h4
                        style={{
                          margin: "0 0 10px",
                          fontSize: 15,
                          fontWeight: adminTokens.typography.fontWeight.bold,
                          color: "#93c5fd",
                        }}
                      >
                        {grupo.titulo}
                      </h4>
                      <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
                        {grupo.itens.map((item) => {
                          const href = item.path ? url(item.path) : null;
                          const coluna = COLUNA_URL_POR_CHAVE[item.key];
                          const temColuna =
                            !!coluna &&
                            typeof proposta?.[coluna] === "string" &&
                            !!(proposta[coluna] as string).trim();

                          return (
                            <div
                              key={item.key}
                              style={{
                                padding: adminTokens.sizes.input.padding,
                                borderRadius: adminTokens.borderRadius.sm,
                                background: adminTokens.colors.surface.subtle,
                                border: "1px solid rgba(148,163,184,0.10)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: adminTokens.typography.fontWeight.bold,
                                  color: "#ffffff",
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.label}
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 13,
                                  color: adminTokens.colors.text.muted,
                                  wordBreak: "break-word",
                                }}
                              >
                                {item.path ? (
                                  <>
                                    <span style={{ display: "block", marginBottom: 6 }}>
                                      Arquivo: {item.path}
                                    </span>
                                    {href && temColuna ? (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          ...btn("#22c55e", "#052e16"),
                                          fontSize: 13,
                                          padding: "6px 12px",
                                        }}
                                      >
                                        Baixar documento
                                      </a>
                                    ) : (
                                      <span>
                                        Registrado na mensagem do envio (sem coluna
                                        dedicada para download automático).
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Regularidade fiscal da entidade">
            {carregandoCertidoes ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Carregando certidões...
              </span>
            ) : cnpjProposta.length !== 14 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                CNPJ da proposta inválido ou não informado.
              </span>
            ) : certidoesEntidade.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhuma certidão cadastrada para esta entidade.
              </span>
            ) : (
              <>
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: adminTokens.spacing.base,
                    color: adminTokens.colors.text.muted,
                    fontSize: 14,
                  }}
                >
                  CNPJ consultado: {cnpjProposta}
                </p>
                <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
                  {certidoesEntidade.map((item) => {
                    const validade = situacaoValidadeCertidao(item.validade_ate);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: adminTokens.sizes.input.padding,
                          borderRadius: adminTokens.borderRadius.sm,
                          background: adminTokens.colors.surface.subtle,
                          border: "1px solid rgba(148,163,184,0.10)",
                        }}
                      >
                        <strong style={{ color: "#fff", fontSize: 15 }}>
                          {item.tipo_nome}
                        </strong>
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            marginTop: adminTokens.spacing.sm,
                            fontSize: 14,
                            color: adminTokens.colors.text.secondary,
                          }}
                        >
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Órgão emissor:
                            </strong>{" "}
                            {item.orgao_emissor}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Esfera:
                            </strong>{" "}
                            {labelCampoCertidao(item.esfera)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Status:
                            </strong>{" "}
                            {labelCampoCertidao(item.status)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Validade:
                            </strong>{" "}
                            {formatarDataCertidao(item.validade_ate)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Versão:
                            </strong>{" "}
                            v{item.versao}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Situação:
                            </strong>{" "}
                            <span style={{ color: validade.cor, fontWeight: 600 }}>
                              {validade.texto}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Documentos Disponíveis para Download">
            <div style={{ display: "flex", gap: adminTokens.spacing.base, flexWrap: "wrap" }}>
              {downloads.length === 0 ? (
                <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                  Nenhum documento disponível para download.
                </span>
              ) : (
                downloads.map((item) => (
                  <a
                    key={item.label}
                    href={url(item.path)!}
                    target="_blank"
                    rel="noreferrer"
                    style={btn(item.bg, item.color)}
                  >
                    {item.label}
                  </a>
                ))
              )}
            </div>
          </InfoCard>
        </div>

        <div
          style={{
            marginTop: adminTokens.spacing.xxxl,
            paddingTop: gap20,
            borderTop: borderLight,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <button
            onClick={excluirProposta}
            style={{
              background: adminTokens.colors.error.background,
              color: adminTokens.colors.error.text,
              padding: `${adminTokens.spacing.base}px ${adminTokens.spacing.xxl}px`,
              borderRadius: adminTokens.borderRadius.full,
              border: "none",
              cursor: "pointer",
              fontWeight: adminTokens.typography.fontWeight.bold,
              fontSize: adminTokens.sizes.button.medium.fontSize,
              boxShadow: adminTokens.shadows.buttonRed,
            }}
          >
            Excluir Proposta
          </button>
        </div>
      </div>
    </div>
  );
}