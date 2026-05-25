# Padrões — páginas públicas

Guia para consolidar o site público sem alterar identidade visual IPECC.

## Layout global

- Chrome (header/menu/footer): `app/layout.tsx` (fonte da verdade).
- `components/PublicLayout.tsx`: legado; não usar em páginas novas.

## Componentes

| Componente | Uso |
|------------|-----|
| `PublicHeroRolling` | Hero com `hero-rolling` + `--hero-bg-image`; `children` opcional (ex.: CTA home) |
| `PublicPageContent` | Wrapper `.public-content` / `__inner` |
| Classes `.public-card*` | Listagens (eventos, notícias) |
| Classes `.public-article*` | Detalhe de notícia (`public-content--article`) |

| `PublicProjectDetail` | Páginas filhas de `/projetos` |

Import centralizado:

```tsx
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
```

## Supabase (leitura pública em Server Components)

| Cliente | Quando |
|---------|--------|
| `supabasePublic` | Listagens públicas sem sessão (`editais`, `eventos`, `noticias`) |
| `createClient()` (`supabaseServer`) | Detalhe com cookies SSR ou rotas que precisam de contexto |
| `supabaseClient` | Apenas **Client Components** (formulários, admin) |

## Mobile

- Grids `.public-card-grid` → 1 coluna em `max-width: 640px`.
- Header: breakpoints existentes em `globals.css` (960px / 640px).

## Validação por batch

```bash
npm run typecheck
npm run validar:publico
npm run validar:enterprise
```

Opcional: `PUBLIC_FETCH_LOG=1` no `.env.local` para ver `[public-fetch]` no terminal.
