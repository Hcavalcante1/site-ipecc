# BATCH 14 — Smoke HTTP público + webhook

## Escopo

- `npm run validar:smoke-publico` — rotas principais + `/contato` + webhook GET 403.
- `npm run validar:whatsapp-webhook` — E2E in-process de `processWebhookPost`.
- `npm run validar:whatsapp-webhook-http` — smoke opcional contra `localhost:3000` (com dev).

## Validação

```bash
npx tsc --noEmit
npm run validar:whatsapp-webhook
npm run validar:smoke-publico          # requer npm run dev
npm run validar:whatsapp-webhook-http  # opcional; WHATSAPP_APP_SECRET em .env.local
```

## Próximo

- Rodada mobile humana (`docs/VISUAL-GO-LIVE-CHECKLIST.md`).
- Meta sandbox + tunnel no webhook.
- Fase 3 WhatsApp (painel admin atendimentos).
