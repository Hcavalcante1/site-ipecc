const legacyMediaMap: Record<string, string> = {
  'ipecc_logo_v2.png': '/media/global/logos/ipecc_logo_v2.png',
  'logo-apecc.png': '/media/global/logos/logo-apecc.png',
  'fundo-numeros.jpg': '/media/global/backgrounds/fundo-numeros.jpg',
  'projetos.jpg': '/media/home/cards/projetos.jpg',
  'transparencia.jpg': '/media/home/cards/transparencia.jpg',
  'contato.jpg': '/media/home/cards/contato.jpg',
  'evento-cultural.jpg': '/media/home/destaques/evento-cultural.jpg',
  'oficina-educacao.jpg': '/media/home/destaques/oficina-educacao.jpg',
  'acao-social.jpg': '/media/home/destaques/acao-social.jpg',
  'impacto-social.jpg': '/media/home/impacto/impacto-social.jpg',
  'projetos-escolas.jpg': '/media/projetos/destaques/projetos-escolas.jpg',
  'projetos-circuito-cultural.jpg': '/media/projetos/destaques/projetos-circuito-cultural.jpg',
  'projetos-parcerias.jpg': '/media/projetos/destaques/projetos-parcerias.jpg',
  'eixo-cultura.jpg': '/media/projetos/eixos/eixo-cultura.jpg',
  'eixo-educacao.jpg': '/media/projetos/eixos/eixo-educacao.jpg',
  'eixo-esporte.jpg': '/media/projetos/eixos/eixo-esporte.jpg',
  'eixo-gestao.jpg': '/media/projetos/eixos/eixo-gestao.jpg',
  'institucional-quem-somos.jpg': '/media/quem-somos/institucional/institucional-quem-somos.jpg',
  'rede-apecc.jpg': '/media/quem-somos/atuacao/rede-apecc.jpg',
  'eventos.jpg': '/media/eventos/eventos.jpg',
  'news-1.jpg': '/media/noticias/news-1.jpg',
  'news-2.jpg': '/media/noticias/news-2.jpg',
  'news-3.jpg': '/media/noticias/news-3.jpg',
  'mapa-placeholder.jpg': '/media/contato/mapa-placeholder.jpg',
  'eixo-default.jpg': '/media/shared/fallbacks/eixo-default.jpg',
  'nova-imagem.jpg': '/media/shared/fallbacks/nova-imagem.jpg',
  'defaut.jpg': '/media/shared/fallbacks/defaut.jpg',
  'hero-poster.jpg': '/media/shared/fallbacks/hero-poster.jpg',
  'hero.mp4': '/media/shared/fallbacks/hero.mp4',
  'cultura.jpg': '/media/shared/fallbacks/cultura.jpg',
  'desenvolvimento.jpg': '/media/shared/fallbacks/desenvolvimento.jpg',
  'educacao.jpg': '/media/shared/fallbacks/educacao.jpg',
  'oficinas.jpg': '/media/shared/fallbacks/oficinas.jpg',
};

export function resolveMediaPath(input?: string | null): string {
  if (!input) return '';
  const value = input.trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;

  const clean = value.split('?')[0].split('#')[0];
  const basename = clean.split('/').filter(Boolean).pop() || clean;

  if (legacyMediaMap[basename]) return legacyMediaMap[basename];

  if (value.startsWith('/media/')) return value;
  if (value.startsWith('/')) return value;

  return `/media/${value}`;
}
