import { rotuloTipoModelo } from "./labels";
import type { GdTemplateKind } from "./types";

export type GdTemplateFieldKey =
  | "titulo"
  | "objeto"
  | "prazo"
  | "partes"
  | "destinatario"
  | "assunto"
  | "fundamento"
  | "observacoes"
  | "periodo"
  | "metas"
  | "resultados"
  | "responsavel"
  | "declaracao";

export type GdTemplateFieldValues = Record<GdTemplateFieldKey, string>;

export type GdTemplateFieldConfig = {
  key: GdTemplateFieldKey;
  label: string;
  placeholder: string;
  help?: string;
  multiline?: boolean;
  rows?: number;
};

export const GD_TEMPLATE_FIELD_KEYS: readonly GdTemplateFieldKey[] = [
  "titulo",
  "objeto",
  "prazo",
  "partes",
  "destinatario",
  "assunto",
  "fundamento",
  "observacoes",
  "periodo",
  "metas",
  "resultados",
  "responsavel",
  "declaracao",
] as const;

export function getDefaultGdTemplateFieldValues(): GdTemplateFieldValues {
  return {
    titulo: "",
    objeto: "",
    prazo: "",
    partes: "",
    destinatario: "",
    assunto: "",
    fundamento: "",
    observacoes: "",
    periodo: "",
    metas: "",
    resultados: "",
    responsavel: "",
    declaracao: "",
  };
}

function clean(v: string | undefined | null, fallback = "—") {
  const s = String(v || "").trim();
  return s || fallback;
}

function section(title: string, content: string) {
  return `${title}\n${content.trim() || "—"}`.trim();
}

function entry(label: string, value: string) {
  return `${label}: ${clean(value)}`;
}

function baseHeader(kind: string, name: string, values: GdTemplateFieldValues) {
  return [
    "PADRÃO INSTITUCIONAL IPECC",
    `Modelo: ${rotuloTipoModelo(kind)}`,
    `Nome: ${clean(name)}`,
    entry("Título", values.titulo),
    entry("Objeto", values.objeto),
    entry("Prazo", values.prazo),
  ].join("\n");
}

export function getGdTemplateFieldConfigs(
  kind: string
): GdTemplateFieldConfig[] {
  switch (kind) {
    case "oficio":
      return [
        {
          key: "titulo",
          label: "Número / identificação",
          placeholder: "Ex.: Ofício nº 012/2026",
        },
        {
          key: "destinatario",
          label: "Destinatário",
          placeholder: "Ex.: À Diretoria ...",
          multiline: true,
          rows: 2,
        },
        {
          key: "assunto",
          label: "Assunto",
          placeholder: "Ex.: Solicitação de ...",
        },
        {
          key: "objeto",
          label: "Objeto",
          placeholder: "Descreva o pedido ou comunicação.",
          multiline: true,
          rows: 3,
        },
        {
          key: "prazo",
          label: "Prazo",
          placeholder: "Ex.: 10 dias úteis",
        },
        {
          key: "fundamento",
          label: "Fundamento / referência",
          placeholder: "Base legal, normativo interno ou referência institucional.",
          multiline: true,
          rows: 3,
        },
        {
          key: "responsavel",
          label: "Responsável / assinante",
          placeholder: "Nome da autoridade que assina o ofício",
        },
        {
          key: "observacoes",
          label: "Fecho / observações",
          placeholder: "Ex.: Sem mais, renovamos votos de estima.",
          multiline: true,
          rows: 3,
        },
      ];
    case "declaracao":
      return [
        {
          key: "titulo",
          label: "Título / identificação",
          placeholder: "Ex.: Declaração de ...",
        },
        {
          key: "partes",
          label: "Declarante / responsável",
          placeholder: "Nome completo ou razão social",
        },
        {
          key: "declaracao",
          label: "Texto da declaração",
          placeholder: "Declaro, para os devidos fins, que ...",
          multiline: true,
          rows: 4,
        },
        {
          key: "objeto",
          label: "Objeto / finalidade",
          placeholder: "Finalidade da declaração",
          multiline: true,
          rows: 2,
        },
        {
          key: "prazo",
          label: "Prazo / validade",
          placeholder: "Ex.: válido até 31/12/2026",
        },
        {
          key: "observacoes",
          label: "Observações",
          placeholder: "Informações complementares ou ressalvas",
          multiline: true,
          rows: 3,
        },
      ];
    case "plano_trabalho":
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Ex.: Plano de Trabalho do Projeto ...",
        },
        {
          key: "objeto",
          label: "Objeto",
          placeholder: "Descreva o objeto do plano.",
          multiline: true,
          rows: 3,
        },
        {
          key: "prazo",
          label: "Prazo / vigência",
          placeholder: "Ex.: 12 meses",
        },
        {
          key: "metas",
          label: "Metas / entregas",
          placeholder: "Liste metas e entregas principais.",
          multiline: true,
          rows: 4,
        },
        {
          key: "resultados",
          label: "Resultados esperados",
          placeholder: "Descreva os resultados esperados.",
          multiline: true,
          rows: 3,
        },
        {
          key: "fundamento",
          label: "Justificativa / fundamento",
          placeholder: "Base institucional, legal ou técnica.",
          multiline: true,
          rows: 3,
        },
        {
          key: "responsavel",
          label: "Responsável / signatário",
          placeholder: "Nome de quem assina o plano",
        },
        {
          key: "observacoes",
          label: "Observações",
          placeholder: "Cronograma, anexos, ajustes ou comentários.",
          multiline: true,
          rows: 3,
        },
      ];
    case "prestacao_contas":
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Ex.: Prestação de Contas ...",
        },
        {
          key: "periodo",
          label: "Período",
          placeholder: "Ex.: jan/2026 a dez/2026",
        },
        {
          key: "objeto",
          label: "Objeto / referência",
          placeholder: "Informe a parceria, projeto ou instrumento de referência.",
          multiline: true,
          rows: 3,
        },
        {
          key: "resultados",
          label: "Resultados / execução",
          placeholder: "Resumo dos resultados alcançados.",
          multiline: true,
          rows: 4,
        },
        {
          key: "fundamento",
          label: "Fundamento / conformidade",
          placeholder: "Norma, edital, termo ou referência institucional.",
          multiline: true,
          rows: 3,
        },
        {
          key: "responsavel",
          label: "Responsável / signatário",
          placeholder: "Nome de quem assina a prestação",
        },
        {
          key: "observacoes",
          label: "Observações finais",
          placeholder: "Pendências, ressalvas e encaminhamentos.",
          multiline: true,
          rows: 3,
        },
      ];
    case "convenio":
    case "termo":
    case "contrato":
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Ex.: Contrato de ...",
        },
        {
          key: "partes",
          label: "Partes",
          placeholder: "Ex.: IPECC e ...",
          multiline: true,
          rows: 3,
        },
        {
          key: "objeto",
          label: "Objeto",
          placeholder: "Descreva o objeto do instrumento.",
          multiline: true,
          rows: 4,
        },
        {
          key: "prazo",
          label: "Prazo / vigência",
          placeholder: "Ex.: 12 meses",
        },
        {
          key: "fundamento",
          label: "Cláusulas / fundamento",
          placeholder: "Cláusulas principais, base legal ou referência institucional.",
          multiline: true,
          rows: 4,
        },
        {
          key: "responsavel",
          label: "Responsável / signatário",
          placeholder: "Nome da autoridade ou representante",
        },
        {
          key: "observacoes",
          label: "Disposições finais",
          placeholder: "Condições complementares, assinatura e publicidade.",
          multiline: true,
          rows: 3,
        },
      ];
    case "ata":
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Ex.: Ata de reunião ...",
        },
        {
          key: "periodo",
          label: "Data / período",
          placeholder: "Ex.: 17/07/2026",
        },
        {
          key: "partes",
          label: "Participantes",
          placeholder: "Nome dos presentes ou da comissão.",
          multiline: true,
          rows: 4,
        },
        {
          key: "assunto",
          label: "Pauta / assunto",
          placeholder: "Tema da reunião",
          multiline: true,
          rows: 3,
        },
        {
          key: "objeto",
          label: "Deliberações / objeto",
          placeholder: "Síntese das decisões e encaminhamentos.",
          multiline: true,
          rows: 4,
        },
        {
          key: "observacoes",
          label: "Encerramento / observações",
          placeholder: "Registro final da ata.",
          multiline: true,
          rows: 3,
        },
      ];
    case "relatorio":
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Ex.: Relatório técnico ...",
        },
        {
          key: "periodo",
          label: "Período",
          placeholder: "Ex.: 1º trimestre de 2026",
        },
        {
          key: "objeto",
          label: "Objeto / escopo",
          placeholder: "Descreva o que foi acompanhado.",
          multiline: true,
          rows: 3,
        },
        {
          key: "resultados",
          label: "Resultados / achados",
          placeholder: "Resumo dos resultados, evidências ou achados.",
          multiline: true,
          rows: 4,
        },
        {
          key: "fundamento",
          label: "Fundamento / método",
          placeholder: "Critérios, base técnica ou institucional.",
          multiline: true,
          rows: 3,
        },
        {
          key: "responsavel",
          label: "Responsável / signatário",
          placeholder: "Nome do responsável pelo relatório",
        },
        {
          key: "observacoes",
          label: "Conclusão / observações",
          placeholder: "Conclusão final e encaminhamentos.",
          multiline: true,
          rows: 3,
        },
      ];
    default:
      return [
        {
          key: "titulo",
          label: "Título",
          placeholder: "Título do documento",
        },
        {
          key: "objeto",
          label: "Objeto",
          placeholder: "Descreva o conteúdo principal.",
          multiline: true,
          rows: 4,
        },
        {
          key: "prazo",
          label: "Prazo / vigência",
          placeholder: "Ex.: 30 dias",
        },
        {
          key: "fundamento",
          label: "Fundamento / referência",
          placeholder: "Base legal, normativa ou institucional.",
          multiline: true,
          rows: 3,
        },
        {
          key: "observacoes",
          label: "Observações finais",
          placeholder: "Informações complementares.",
          multiline: true,
          rows: 3,
        },
      ];
  }
}

export function buildGdTemplateBody(
  kind: GdTemplateKind,
  modelName: string,
  values: GdTemplateFieldValues
): string {
  const header = baseHeader(kind, modelName, values);
  const padrao =
    "Documento emitido no padrão institucional do IPECC, com campos variáveis mínimos e demais cláusulas padronizadas.";
  const fechoInstitucional =
    "Este instrumento preserva o texto institucional e normativo aplicável, cabendo alteração apenas dos campos específicos do caso concreto.";
  const assinatura = [
    "",
    "________________________________________",
    "Assinatura da autoridade competente",
  ].join("\n");
  const textoOficio = clean(
    values.objeto,
    "Encaminha-se a presente comunicação para ciência e providências cabíveis."
  );

  switch (kind) {
    case "oficio":
      return [
        header,
        "",
        section(
          "EXPEDIENTE",
          [
            `Ofício: ${clean(values.titulo, "Ofício")}`,
            `Destinatário: ${clean(values.destinatario)}`,
            `Assunto: ${clean(values.assunto)}`,
          ].join("\n")
        ),
        "",
        section(
          "TEXTO",
          [
            "Senhor(a),",
            "",
            textoOficio,
            "",
            `Prazo / providência esperada: ${clean(values.prazo)}`,
            `Fundamento / referência: ${clean(values.fundamento)}`,
          ].join("\n")
        ),
        "",
        section(
          "FECHO",
          clean(
            values.observacoes,
            "Sem mais para o momento, renovamos protestos de elevada estima e consideração."
          )
        ),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "declaracao":
      return [
        header,
        "",
        section(
          "DECLARAÇÃO",
          clean(
            values.declaracao,
            "Declaro, para os devidos fins e sob as penas da lei, a veracidade e a pertinência das informações apresentadas."
          )
        ),
        "",
        section("DECLARANTE / RESPONSÁVEL", clean(values.partes)),
        "",
        section("FINALIDADE", clean(values.objeto)),
        "",
        section("PRAZO / VALIDADE", clean(values.prazo)),
        "",
        section("OBSERVAÇÕES", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "plano_trabalho":
      return [
        header,
        "",
        section("IDENTIFICAÇÃO", clean(values.titulo)),
        "",
        section("OBJETO", clean(values.objeto)),
        "",
        section("PRAZO / VIGÊNCIA", clean(values.prazo)),
        "",
        section("METAS / ENTREGAS", clean(values.metas)),
        "",
        section("RESULTADOS ESPERADOS", clean(values.resultados)),
        "",
        section("JUSTIFICATIVA / FUNDAMENTO", clean(values.fundamento)),
        "",
        section("OBSERVAÇÕES", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "prestacao_contas":
      return [
        header,
        "",
        section("PERÍODO", clean(values.periodo)),
        "",
        section("OBJETO / REFERÊNCIA", clean(values.objeto)),
        "",
        section("RESULTADOS / EXECUÇÃO", clean(values.resultados)),
        "",
        section("CONFORMIDADE / FUNDAMENTO", clean(values.fundamento)),
        "",
        section("OBSERVAÇÕES FINAIS", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "convenio":
    case "termo":
    case "contrato":
      return [
        header,
        "",
        section(
          "PREÂMBULO",
          [
            `Pelo presente instrumento, as partes qualificadas em ${clean(values.partes)}`,
            `firmam o presente ${rotuloTipoModelo(kind).toLowerCase()}, que se regerá pelas cláusulas e condições seguintes.`,
          ].join("\n")
        ),
        "",
        section("OBJETO", clean(values.objeto)),
        "",
        section("PRAZO / VIGÊNCIA", clean(values.prazo)),
        "",
        section("CLÁUSULAS / FUNDAMENTO", clean(values.fundamento)),
        "",
        section(
          "DISPOSIÇÕES FINAIS",
          clean(
            values.observacoes,
            "Permanecem válidas as disposições padronizadas do instrumento, na forma da legislação e da regulamentação aplicáveis."
          )
        ),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "ata":
      return [
        header,
        "",
        section("DATA / PERÍODO", clean(values.periodo)),
        "",
        section("PARTICIPANTES", clean(values.partes)),
        "",
        section("PAUTA / ASSUNTO", clean(values.assunto)),
        "",
        section(
          "DELIBERAÇÕES / OBJETO",
          clean(
            values.objeto,
            "Deliberações registradas conforme a ordem da pauta e as decisões colegiadas adotadas."
          )
        ),
        "",
        section("ENCERRAMENTO / OBSERVAÇÕES", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    case "relatorio":
      return [
        header,
        "",
        section("PERÍODO", clean(values.periodo)),
        "",
        section("ESCOPO / OBJETO", clean(values.objeto)),
        "",
        section("RESULTADOS / ACHADOS", clean(values.resultados)),
        "",
        section("BASE TÉCNICA / FUNDAMENTO", clean(values.fundamento)),
        "",
        section("CONCLUSÃO / OBSERVAÇÕES", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
    default:
      return [
        header,
        "",
        section("OBJETO", clean(values.objeto)),
        "",
        section("PRAZO / VIGÊNCIA", clean(values.prazo)),
        "",
        section("FUNDAMENTO / REFERÊNCIA", clean(values.fundamento)),
        "",
        section("OBSERVAÇÕES FINAIS", clean(values.observacoes)),
        "",
        padrao,
        fechoInstitucional,
        assinatura,
      ].join("\n");
  }
}
