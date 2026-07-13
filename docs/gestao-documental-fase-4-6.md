# Gestão Documental — Fases 4, 5 e 6

## Fase 4 — gov.br real

- `GovBrProvider` com OAuth2 (authorize + token) e `assinarPKCS7`
- Pedidos em `gd_signature_documents`
- Estados OAuth em `gd_oauth_states` (SQL `gestao-documental-fase-4-6.sql`)
- APIs:
  - `GET/POST /api/admin/documentos/assinaturas`
  - `POST /api/admin/documentos/assinaturas/authorize`
  - `GET /api/admin/documentos/assinaturas/callback`
  - `POST /api/admin/documentos/assinaturas/[id]/assinar`
  - `GET/PATCH /api/admin/documentos/configuracoes`
- UI: `/admin/documentos/assinaturas`, `/admin/documentos/configuracoes`

### Env (servidor / Vercel)

```
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://www.ipecc.org.br/api/admin/documentos/assinaturas/callback
GOVBR_SIGNATURE_ENV=staging
```

Redirect URI deve estar cadastrado no portal de integração gov.br/ITI.

## Fase 5 — Lotes e multi-signatários

- CRUD de lotes (`gd_signature_batches` + items)
- CRUD de signatários (`gd_signature_signers`) com modo sequencial/paralelo
- Autorização de lote com scope `signature_session`
- UI: `/admin/documentos/lotes`, `/admin/documentos/signatarios`
- APIs: `/api/admin/documentos/lotes`, `/api/admin/documentos/signatarios`

## Fase 6 — Notificações e integrações

- Tabela `gd_notifications`
- Eventos em: criação de assinatura, assinatura concluída, lote criado, signatário convidado, transição de fluxo (`ready_to_sign` / `signed` / `rejected`)
- UI: `/admin/documentos/notificacoes`
- API: `GET/PATCH /api/admin/documentos/notificacoes`
- Canal `email` cria fila (sem envio SMTP nesta fase — in-app prioritário)

## SQL

Aplicar no Supabase após as fases 1–3:

`docs/sql/gestao-documental-fase-4-6.sql`

## Validação

```
npm run validar:documentos
npx tsc --noEmit
```
