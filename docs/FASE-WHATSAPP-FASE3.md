# WhatsApp — Fase 3 (painel admin)

## Escopo

- `/admin/whatsapp` — listagem de conversas persistidas, filtro handoff, atribuir responsável, encerrar.
- `GET/PATCH /api/admin/whatsapp/conversations` — `verifyAdminSession` + `supabaseAdmin` (sem RLS anon na tabela).

## Pré-requisitos staging

1. Aplicar manualmente `docs/sql/whatsapp-conversations-staging.sql` no Supabase.
2. `.env.local`: `WHATSAPP_PERSIST_SUPABASE=1` (servidor / webhook).
3. Reiniciar `npm run dev` após criar a tabela.

## Validação

```bash
npx tsc --noEmit
npm run validar:whatsapp-fase3
```

Com sessão admin logada: abrir `http://localhost:3000/admin/whatsapp`.

## Próximo

- Conta Meta sandbox + tunnel no webhook.
- [x] Handoff registrado em `admin_logs` (`HANDOFF`, e-mail `whatsapp-bot@ipecc.local`).
- Go-live apenas com autorização explícita.
