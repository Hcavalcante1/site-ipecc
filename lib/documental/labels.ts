import type { StatusDocumentalAuto } from "./types";

export const LABEL_INSTITUCIONAL_POR_CHAVE: Record<string, string> = {
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

export const LABEL_STATUS_DOCUMENTAL: Record<StatusDocumentalAuto, string> = {
  documentacao_completa: "Documentação completa",
  documentacao_pendente: "Documentação pendente",
  documentacao_irregular: "Documentação irregular",
  em_analise: "Em análise",
};
