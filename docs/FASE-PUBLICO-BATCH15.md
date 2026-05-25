# BATCH 15 — Smoke ampliado + mobile heroes + persistência WhatsApp

## Escopo

- `validar:smoke-publico` — 4 páginas filhas `/projetos/*`, `/api/health`, webhook (403 ou 503).
- CSS mobile ≤640px — `hero-rolling` (título/texto/padding).
- `validar:whatsapp-persist` — teste opcional Supabase (`WHATSAPP_PERSIST_SUPABASE=1` + SQL).
- Fase 2 — assert opção 6 handoff.

## Validação

```bash
npx tsc --noEmit
npm run validar:whatsapp-fase2
npm run validar:smoke-publico
npm run validar:whatsapp-persist   # opcional, com .env.local + tabela
```

## Próximo

- Rodada mobile humana (DevTools 375px).
- Meta sandbox com tunnel (`docs/WHATSAPP-META-SANDBOX.md`).
- Limpeza CMS staging (editais/transparência).
