# Fase público — BATCH 8 (staging)

## Escopo

- Client Supabase público unificado (`supabasePublic` em `/contato`).
- Observabilidade leve (`logPublicFetch`) em `/projetos`, `/editais`, `/transparencia`.
- Mobile seguro: `overflow-x: clip`, mídia/tabelas em `.public-content` (≤640px).
- Gate: `npm run validar:publico` (sem `supabaseClient` em rotas públicas).

## Validação

```bash
npm run typecheck
npm run validar:publico
npm run validar:enterprise
```

Smoke manual: `/contato`, `/projetos`, `/editais`, `/transparencia`.

## Próximo (BATCH 9)

- Padronizar imports via `components/public/index.ts`.
- Extrair blocos repetidos (hero + grid) sem alterar markup visual aprovado.
- Passada responsiva por página (quem-somos, home, ações).
