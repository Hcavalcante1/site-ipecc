# BATCH 16 — Mobile 375px (correções visuais mínimas)

**Data:** 2026-05-25 · viewport **375×812** (DevTools / browser MCP)

## Páginas verificadas (13/13)

| Página | HTTP | Overflow 375px | Observação |
|--------|------|----------------|------------|
| `/` | 200 | OK | Hero, cards, destaques, menu hambúrguer |
| `/propostas` | 200 | OK | Grids 2 colunas estreitos → corrigido |
| `/editais` | 200 | OK | Listagem cards |
| `/projetos` | 200 | OK | Hero + eixos |
| `/projetos/valer-mais` | 200 | OK | PublicProjectDetail |
| `/projetos/cultura-inclusao-social` | 200 | OK | idem |
| `/projetos/parcerias-institucionais` | 200 | OK | idem |
| `/projetos/oficinas-educacao-cidada` | 200 | OK | idem |
| `/transparencia` | 200 | OK | Grids 2 col inline → 1 col mobile |
| `/quem-somos` | 200 | OK | Seções empilhadas |
| `/noticias` | 200 | OK | public-card-grid 1 col |
| `/eventos` | 200 | OK | idem |
| `/contato` | 200 | OK | Formulário / hero |

## Problemas encontrados

| Severidade | Problema | Página |
|------------|----------|--------|
| Médio | Campos nome/CNPJ e e-mail/telefone em **2 colunas** apertadas | `/propostas` |
| Médio | Pills de etapas estreitas, difícil leitura/toque | `/propostas` |
| Médio | `.cards__grid` com `grid-template-columns` inline (2 col) vence CSS | `/transparencia` |
| Baixo | Grids internos de convênios/prestação em 2 colunas | `/transparencia` |
| Baixo | Títulos de cards grandes em listagens | notícias/eventos/editais |
| Baixo | Botões hero com texto longo sem quebra | heroes diversos |

**Não corrigido neste batch (conteúdo/CMS):** textos de teste em transparência, typo “Projetos” duplicado na home, APECC vs IPECC no copy.

## Correções aplicadas

- `public-form-grid-2` — grid 2 col desktop, **1 col ≤640px**
- `public-form-steps` — pills de etapa **largura total** no mobile
- `.cards__grid` — `1fr !important` no mobile (vence inline em transparência)
- `.sobre div[style*="grid-template-columns"]` — 1 col no mobile
- Hero rolling — `width: min(94%)`, `min-height`, título/texto já ajustados
- `.public-card__title`, `.btn.btn--light`, `.public-page-actions` — mobile
- `.container` — `min(94%)` global ≤640px

## Validação

```bash
npx tsc --noEmit
npm run validar:smoke-publico
```

## Próximo

Rodada humana no celular físico (opcional). Conteúdo staging: limpeza CMS.
