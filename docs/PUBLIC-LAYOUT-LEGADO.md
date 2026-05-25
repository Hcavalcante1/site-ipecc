# Layout público — legado vs atual

## Fonte da verdade (uso hoje)

O chrome público (topbar, menu, footer) está em **`app/layout.tsx`** (`"use client"`).

- Rotas internas (`/login`, `/admin`, `/app`) renderizam só `children`.
- Demais rotas recebem header + `<main className="page">` + footer.

Não duplicar header/footer em páginas individuais.

## Arquivos legados (não remover sem autorização)

| Arquivo | Situação |
|---------|----------|
| `components/PublicLayout.tsx` | Cópia antiga do header (links/redes desatualizados). **Não é importado** pelo `app/layout.tsx`. |
| `components/LayoutGate.tsx` | Wrapper que injetava `PublicLayout`; **não há imports** no App Router atual. |

## Por que manter no repositório

- Evitar diff grande e risco de regressão em branches antigas.
- Referência histórica até decisão explícita de remoção pós-go-live.

## O que fazer em novas páginas públicas

1. Conteúdo da página apenas (hero + seções).
2. Hero: `PublicHeroRolling` de `@/components/public`.
3. Listagens: `PublicPageContent` + classes `.public-card*`.
4. Supabase: `supabasePublic` (client) ou `createClient()` de `supabaseServer` (RSC).

Ver também: `docs/PUBLICO-PADROES.md`, `docs/VISUAL-GO-LIVE-CHECKLIST.md`.
