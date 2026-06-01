# WhatsApp — Meta Cloud API (sandbox local)

Sem deploy e **sem tokens reais no repositório**. Use apenas em `.env.local`.

## Execução rápida (ordem segura)

- [ ] Configurar `.env.local` com `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] Rodar validações locais (`validar:whatsapp-meta` e `validar:whatsapp-webhook`)
- [ ] Expor `localhost:3000` por túnel e registrar callback na Meta
- [ ] Validar handshake `GET` e depois evento `POST` assinado
- [ ] Confirmar handoff em `/admin/whatsapp`

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

### Resultado esperado dos scripts (pass/fail)

- `npm run validar:whatsapp-meta`
  - `OK: subscribe válido retorna challenge`
  - `OK: token errado → forbidden`
  - `OK: sem WHATSAPP_VERIFY_TOKEN → missing_config`
- `npm run validar:whatsapp-webhook`
  - `OK: 503 sem WHATSAPP_APP_SECRET`
  - `OK: 401 assinatura inválida`
  - `OK: 400 JSON inválido`
  - `OK: 200 fixture processado`
  - `OK: idempotência no mesmo messageId`
- `npm run validar:whatsapp-webhook-http` (com `npm run dev`)
  - handshake GET retorna `200` com o challenge
  - POST assinado retorna `200` e JSON com `processed=1`

## Coleta de evidências (PowerShell)

Com `npm run dev` ativo em outro terminal, execute:

```powershell
npm run coletar:evidencias-whatsapp-meta
```

O script de coleta agora faz preflight em `http://localhost:3000` e falha cedo se o dev server não estiver ativo.

Arquivos gerados:

- `reports/whatsapp-meta.txt`
- `reports/whatsapp-webhook.txt`
- `reports/whatsapp-webhook-http.txt`
- `reports/whatsapp-handoff-fase4.txt`

Para gerar um resumo pronto para colar no status:

```bash
npm run resumo:whatsapp-meta-evidencias
```

Sequência completa (copiar/colar):

```powershell
# Terminal 1
npm run dev

# Terminal 2
npm run coletar:evidencias-whatsapp-meta
npm run resumo:whatsapp-meta-evidencias
npm run validar:dod-whatsapp-meta
```

Atalho (Terminal 2):

```powershell
npm run fase4:whatsapp-meta
npm run atualizar:status-fase4-whatsapp
```

Atalho completo (fase + atualização do status):

```powershell
npm run diagnostico:fase4-whatsapp-meta
npm run fase4:whatsapp-meta:status
```

Atalho único (tudo em sequência):

```powershell
npm run fase4:whatsapp-meta:full
```

Observação: o pipeline agora inicia com `npm run validar:env-whatsapp-meta` e falha cedo se o `.env.local` estiver incompleto.

## Falhas comuns (ação rápida)

- `validar:whatsapp-meta` falha no handshake:
  - conferir `WHATSAPP_VERIFY_TOKEN` no `.env.local`
  - repetir `npm run coletar:evidencias-whatsapp-meta`
- `validar:whatsapp-webhook` falha em assinatura:
  - conferir `WHATSAPP_APP_SECRET` e reiniciar `npm run dev`
  - repetir coleta
- `validar:whatsapp-webhook-http` sem `processed=1`:
  - garantir servidor local ativo em `http://localhost:3000`
  - confirmar fixture `scripts/fixtures/whatsapp-text-inbound.json`
  - repetir coleta

Se qualquer report vier com `FALHA`/`ERROR`, não marcar DoD da Fase 4 como concluído.

`npm run validar:dod-whatsapp-meta` também falha com `SKIP` por padrão.
Se houver justificativa operacional aprovada, rode com override explícito:

```powershell
$env:WHATSAPP_DOD_ALLOW_SKIP="1"
npm run validar:dod-whatsapp-meta
```

Também valida frescor dos reports (padrão: até 6h).
Para ajustar janela de validade:

```powershell
$env:WHATSAPP_DOD_MAX_AGE_HOURS="12"
npm run validar:dod-whatsapp-meta
```

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
