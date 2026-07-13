# Gestão Documental — Fechamento (Fases 1–6)

## Status

**Módulo encerrado para operação institucional no Admin IPECC.**  
Entregue e publicado em `main` (`site-ipecc` / Vercel).

| Fase | Conteúdo | Status |
|------|----------|--------|
| 1 | Schema `gd_*`, escopo `documentos`, CRUD, bucket, stub provider | OK |
| 2 | Filtros, favoritos, lixeira, tags, preview, modelos | OK |
| 3 | Fluxos, passos, transições, ACL documento, auditoria IP/UA | OK |
| 4 | Assinatura: Documenso (ente privado) + gov.br OAuth/PKCS#7 | OK (Documenso self-host; gov.br só órgãos públicos) |
| 5 | Lotes, itens, signatários sequencial/paralelo | OK |
| 6 | Notificações in-app + eventos de fluxo/assinatura | OK |

## Onde usar

Base: `/admin/documentos`

- Dashboard, Documentos, Pastas, Categorias, Modelos, Lixeira  
- Fluxos, Assinaturas, Lotes, Signatários, Notificações, Auditoria, Configurações  

No detalhe do documento: **Pedir assinatura** (quando houver arquivo).

## SQL aplicado (Supabase produção)

1. `docs/sql/gestao-documental-fase-1.sql`
2. `docs/sql/admin-escopos-mod-documentos.sql`
3. `docs/sql/gestao-documental-storage-bucket.sql`
4. `docs/sql/gestao-documental-fase-3.sql`
5. `docs/sql/gestao-documental-fase-4-6.sql`
6. `docs/sql/gestao-documental-documenso.sql`

Reaplicar (idempotente): `node scripts/aplicar-gestao-documental.cjs`

## Gate de qualidade

```
npm run validar:documentos
npx tsc --noEmit
```

## Produção — checklist operacional

- [x] Menu Admin com Gestão Documental  
- [x] Tabelas `gd_*` + `mod_documentos` + bucket `gestao-documental`  
- [x] Código em `site-ipecc` / Vercel  
- [ ] Documenso self-host (`services/documenso`) + `DOCUMENSO_API_*` na Vercel  
- [ ] Webhook Documenso → `/api/webhooks/documenso`  
- [ ] SQL `gestao-documental-documenso.sql` aplicado  
- [ ] Vars `GOVBR_SIGNATURE_*` (somente se órgão público / ITI)  

### Env recomendado — Documenso (ente privado)

```
DOCUMENSO_API_URL=https://seu-documenso/api/v2
DOCUMENSO_API_TOKEN=
DOCUMENSO_WEBHOOK_SECRET=
```

### Env opcional — gov.br (só órgãos públicos)

```
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://www.ipecc.org.br/api/admin/documentos/assinaturas/callback
GOVBR_SIGNATURE_ENV=staging
```

A API gov.br **não libera** integração para ente privado. Use Documenso.

## Fluxo operacional recomendado

1. Criar documento (+ upload)  
2. Vincular fluxo e avançar status até **Pronto para assinatura**  
3. **Pedir assinatura** no detalhe (e-mail do signatário → Documenso)  
4. Signatário assina pelo e-mail/link; webhook conclui no admin  
5. (Opcional / órgão público) Autorizar gov.br → Assinar PKCS#7  
6. (Opcional) Lote + signatários  
7. Acompanhar em Notificações e Auditoria  

## Fora deste fechamento (evolução futura)

- Certificado ICP-Brasil A1 no Documenso  
- Embed iframe React do Documenso no admin  
- Provedores SaaS (Clicksign, etc.)  
- Envio SMTP real da fila `channel=email`
- Integração automática bi-direcional com Propostas/Editais  

## Documentação por fase

- `docs/gestao-documental-fase-1.md`
- `docs/gestao-documental-fase-2.md`
- `docs/gestao-documental-fase-3.md`
- `docs/gestao-documental-fase-4-6.md`
