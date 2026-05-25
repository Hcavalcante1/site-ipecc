# WhatsApp — Meta Cloud API (sandbox local)

Sem deploy e **sem tokens reais no repositório**. Use apenas em `.env.local`.

## 1. Variáveis (`.env.local`)

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999990000

WHATSAPP_VERIFY_TOKEN=ipecc_verify_staging_local
WHATSAPP_APP_SECRET=seu_app_secret_do_app_meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0

WHATSAPP_BOT_ENABLED=1
WHATSAPP_DRY_RUN=1
WHATSAPP_PERSIST_SUPABASE=0
WHATSAPP_LOG=1
```

- **`WHATSAPP_DRY_RUN=1`**: não chama Graph API; só loga respostas (recomendado no primeiro teste).
- **`WHATSAPP_PERSIST_SUPABASE=1`**: após aplicar `docs/sql/whatsapp-conversations-staging.sql`.

## 2. Túnel (ngrok ou similar)

```bash
npm run dev
ngrok http 3000
```

URL pública do webhook (exemplo):

`https://SEU_SUBDOMINIO.ngrok-free.app/api/whatsapp/webhook`

No **Meta for Developers** → App → WhatsApp → Configuration → Webhook:

| Campo | Valor |
|-------|--------|
| Callback URL | URL ngrok acima |
| Verify token | Mesmo valor de `WHATSAPP_VERIFY_TOKEN` |

Clique em **Verify and save**. A Meta envia `GET` com `hub.mode=subscribe`.

## 3. Validação local (sem Meta)

```bash
npx tsc --noEmit
npm run validar:whatsapp-meta
npm run validar:whatsapp-webhook
npm run validar:whatsapp-webhook-http   # com dev rodando
npm run validar:whatsapp-persist        # opcional, Supabase + SQL
```

Handshake simulado:

```text
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=ipecc_verify_staging_local&hub.challenge=12345
```

Resposta esperada: corpo `12345` e HTTP 200.

## 4. POST assinado (após `WHATSAPP_APP_SECRET`)

A Meta envia `X-Hub-Signature-256`. O projeto valida com `verifyMetaWebhookSignature`.

Teste com fixture:

```bash
npm run validar:whatsapp-webhook-http
```

Reinicie o dev após alterar `.env.local`.

## 5. Painel admin

Com persistência ativa: `/admin/whatsapp` — handoff aparece com estado **Aguardando equipe**.

Handoff também gera linha em `admin_logs` (`acao=HANDOFF`, `user_email=whatsapp-bot@ipecc.local`).

## 6. Checklist antes de produção

- [ ] Conta Business verificada
- [ ] Número produção autorizado pela equipe
- [ ] RLS e secrets no host (não em git)
- [ ] `WHATSAPP_DRY_RUN=0` apenas quando Graph API estiver pronta
- [ ] `PROD-PREP-CHECKLIST.md` aprovado

## Erros comuns

| Sintoma | Causa provável |
|---------|----------------|
| GET 503 | `WHATSAPP_VERIFY_TOKEN` vazio |
| GET 403 | Token diferente do configurado na Meta |
| POST 401 | `WHATSAPP_APP_SECRET` incorreto ou body alterado |
| POST 503 | `WHATSAPP_APP_SECRET` ausente |
| Painel vazio | Tabela SQL não aplicada ou `WHATSAPP_PERSIST_SUPABASE=0` |
