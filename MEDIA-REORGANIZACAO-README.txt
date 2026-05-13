Reorganização da pasta public/media

O que foi feito:
- Criação de subpastas por página pública e grupos globais.
- Atualização dos caminhos fixos no código para a nova estrutura.
- Criação do helper lib/media.ts para resolver URLs legadas vindas do Supabase.
- Manutenção dos arquivos antigos na raiz de /public/media para compatibilidade e transição segura.

Nova estrutura principal:
- /public/media/global/logos
- /public/media/global/backgrounds
- /public/media/home/cards
- /public/media/home/destaques
- /public/media/home/impacto
- /public/media/projetos/eixos
- /public/media/projetos/destaques
- /public/media/quem-somos/atuacao
- /public/media/quem-somos/institucional
- /public/media/eventos
- /public/media/noticias
- /public/media/contato
- /public/media/shared/fallbacks

Arquivos críticos de compatibilidade:
- lib/media.ts
- public/media/eixo-default.jpg
- public/media/nova-imagem.jpg

Observação:
Se você tiver valores antigos em imagem_url no Supabase (ex.: "projetos.jpg" ou "/media/projetos.jpg"), o projeto continua resolvendo corretamente pela nova estrutura.
