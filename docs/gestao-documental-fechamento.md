# Gestão Documental — Fechamento (Fases 1–6)

## Status

**Módulo Gestão Documental fechado no código e publicado em `main`.**  
Assinatura digital do ente privado usa o provedor **Documento** (motor self-host).

| Fase | Conteúdo | Status |
|------|----------|--------|
| 1 | Schema `gd_*`, escopo `documentos`, CRUD, bucket | OK |
| 2 | Filtros, favoritos, lixeira, tags, preview, modelos | OK |
| 3 | Fluxos, passos, transições, ACL, auditoria IP/UA | OK |
| 4 | Assinatura **Documento** + gov.br (só órgãos públicos) | OK no código |
| 5 | Lotes com envio Documento + sessão gov.br opcional | OK |
| 6 | Notificações in-app + eventos | OK |

## Onde usar

Base: `/admin/documentos`

- Dashboard, Documentos, Pastas, Categorias, Modelos, Lixeira  
- Fluxos, Assinaturas, Lotes, Signatários, Notificações, Auditoria, Configurações  

No detalhe: **Pedir assinatura** (e-mail do signatário).

## SQL (Supabase produção)

1. `docs/sql/gestao-documental-fase-1.sql`
2. `docs/sql/admin-escopos-mod-documentos.sql`
3. `docs/sql/gestao-documental-storage-bucket.sql`
4. `docs/sql/gestao-documental-fase-3.sql`
5. `docs/sql/gestao-documental-fase-4-6.sql`
6. `docs/sql/gestao-documental-documenso.sql` (provedor `documento` + DEFAULT)

## Gate

```
npm run validar:documentos
npx tsc --noEmit
```

## Checklist produção — assinatura Documento

- [x] Menu + tabelas GD + código em Vercel  
- [x] SQL provedor `documento` (nome Documento, ativo)  
- [ ] Subir motor self-host Documento: `services/documenso/` (Docker + SMTP; pasta técnica no repo)  
- [ ] `DOCUMENTO_API_URL` + `DOCUMENTO_API_TOKEN` na Vercel  
- [ ] Webhook → `https://www.ipecc.org.br/api/webhooks/documento`  
- [ ] Smoke test: Pedir assinatura → e-mail → assinar → status `signed`  

### Env obrigatório (ente privado)

```
DOCUMENTO_API_URL=https://seu-dominio-assinaturas/api/v2
DOCUMENTO_API_TOKEN=
DOCUMENTO_WEBHOOK_SECRET=
```

### Env opcional (só órgãos públicos / ITI)

```
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://www.ipecc.org.br/api/admin/documentos/assinaturas/callback
GOVBR_SIGNATURE_ENV=staging
```

A API gov.br **não libera** para ente privado.

## Fluxo recomendado

1. Criar documento + upload PDF  
2. (Opcional) fluxo até pronto para assinatura  
3. **Pedir assinatura** com e-mail  
4. Signatário assina pelo link; webhook grava PDF assinado  
5. Lotes: **Enviar lote (Documento)** com o mesmo e-mail  
6. Notificações / Auditoria  

## Evolução futura (fora deste fechamento)

- ICP-Brasil A1 no motor  
- Embed de assinatura no admin  
- Módulo documentos-oficiais (editais)  
- SMTP da fila `gd_notifications`
