/** Conteúdo estático da landing (index) — escopo do portal IPECC. */

/** Chamada principal (H1) da landing em /. */
export const LANDING_CHAMADA = "Educação, esporte, cultura e cidadania";

export const PROJETOS_DESTAQUE = [
  {
    slug: "valer-mais",
    titulo: "Programa Valer Mais",
    texto:
      "Valorização da educação pública e ações que fortalecem o aprendizado e a permanência escolar.",
    href: "/projetos/valer-mais",
    imagem: "/media/projetos/destaques/projetos-escolas.jpg",
  },
  {
    slug: "oficinas-educacao-cidada",
    titulo: "Oficinas de Educação Cidadã",
    texto:
      "Formação de jovens e adultos com foco em cidadania, sustentabilidade e participação social.",
    href: "/projetos/oficinas-educacao-cidada",
    imagem: "/media/home/destaques/oficina-educacao.jpg",
  },
  {
    slug: "cultura-inclusao-social",
    titulo: "Cultura e Inclusão Social",
    texto:
      "Circuitos culturais, oficinas artísticas e ações de acesso à cultura em territórios periféricos.",
    href: "/projetos/cultura-inclusao-social",
    imagem: "/media/projetos/destaques/projetos-circuito-cultural.jpg",
  },
  {
    slug: "parcerias-institucionais",
    titulo: "Parcerias Institucionais",
    texto:
      "Cooperação com poder público, escolas e OSCs — com metas claras e transparência na execução.",
    href: "/projetos/parcerias-institucionais",
    imagem: "/media/projetos/destaques/projetos-parcerias.jpg",
  },
] as const;

export const MODULOS_PORTAL = [
  {
    titulo: "Projetos e eixos",
    desc: "Portfólio de iniciativas em educação, cultura e cidadania, com páginas por programa.",
    href: "/projetos",
    cta: "Ver projetos",
  },
  {
    titulo: "Editais e chamamentos",
    desc: "Oportunidades abertas, documentos oficiais e status de cada edital.",
    href: "/editais",
    cta: "Consultar editais",
  },
  {
    titulo: "Envio de propostas",
    desc: "Formulário por etapas com checklist documental (PJ, OSC e PF) e habilitação fiscal.",
    href: "/propostas",
    cta: "Enviar proposta",
  },
  {
    titulo: "Transparência ativa",
    desc: "Convênios, prestação de contas, editais de parceria e documentos institucionais.",
    href: "/transparencia",
    cta: "Acessar transparência",
  },
] as const;

export const PUBLICOS = [
  {
    titulo: "Poder público",
    texto: "Parcerias, convênios e prestação de contas acessível online.",
  },
  {
    titulo: "OSCs e fornecedores",
    texto: "Editais, envio de propostas e documentação de habilitação em um fluxo único.",
  },
  {
    titulo: "Comunidade",
    texto: "Projetos locais, eventos, notícias e canais diretos de contato.",
  },
  {
    titulo: "Equipe e gestores",
    texto: "Painel administrativo para conteúdo, editais, propostas e certidões.",
  },
] as const;

export const PASSOS = [
  {
    n: "1",
    titulo: "Conheça a atuação",
    texto: "Explore projetos, eixos temáticos e resultados do IPECC em São Paulo.",
  },
  {
    n: "2",
    titulo: "Participe de um edital",
    texto: "Consulte requisitos, baixe documentos e prepare sua documentação.",
  },
  {
    n: "3",
    titulo: "Envie e acompanhe",
    texto: "Use o portal de propostas e os canais de transparência e contato.",
  },
] as const;

export const FALLBACK_NUMEROS = [
  { valor: "+120", descricao: "Projetos realizados" },
  { valor: "35", descricao: "Municípios atendidos" },
  { valor: "50.000+", descricao: "Pessoas impactadas" },
  { valor: "300+", descricao: "Parceiros envolvidos" },
];
