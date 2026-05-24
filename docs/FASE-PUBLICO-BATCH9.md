# Fase público — BATCH 9 (staging)

## Escopo

- `PublicHeroRolling` + `PublicPageContent` em rotas públicas principais.
- Hero unificado: projetos, editais, quem-somos, contato, ações.
- Detalhe notícia com classes `.public-article*` (sem inline layout).
- Mobile: `.sobre`, `.sobre-cta`, artigo em ≤640px.

## Páginas tocadas

`/noticias`, `/noticias/[id]`, `/eventos`, `/projetos`, `/editais`, `/quem-somos`, `/contato`, `/acoes`

## Validação

```bash
npm run typecheck
npm run validar:publico
```

Smoke: `/acoes`, `/quem-somos`, `/noticias`, `/projetos`

## Próximo (BATCH 10)

- `transparencia` + `propostas` hero padronizado (arquivos grandes).
- Home: tokens mínimos sem alterar seções aprovadas.
- `validar:enterprise` completo após smoke visual.
