# Gestão Documental — Fechamento (Fases 1–6)

## Status

**Módulo encerrado para operação institucional no Admin IPECC.**  
Entregue e publicado em `main` (`site-ipecc` / Vercel).

| Fase | Conteúdo | Status |
|------|----------|--------|
| 1 | Schema `gd_*`, escopo `documentos`, CRUD, bucket, stub provider | OK |
| 2 | Filtros, favoritos, lixeira, tags, preview, modelos | OK |
| 3 | Fluxos, passos, transições, ACL documento, auditoria IP/UA | OK |
| 4 | OAuth2 gov.br + PKCS#7 + UI Assinaturas/Configurações | OK (aguarda credenciais ITI) |
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
- [ ] Vars `GOVBR_SIGNATURE_*` na Vercel (assinatura real)  
- [ ] Redirect URI cadastrado no portal ITI/gov.br  
- [ ] Credenciais staging testadas antes de `GOVBR_SIGNATURE_ENV=production`  

### Env obrigatório só para assinatura gov.br

```
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://www.ipecc.org.br/api/admin/documentos/assinaturas/callback
GOVBR_SIGNATURE_ENV=staging
```

Sem essas vars: criar/revisar documentos, fluxos, lotes, signatários e notificações funcionam; **Autorizar gov.br** retorna erro claro de configuração.

## Fluxo operacional recomendado

1. Criar documento (+ upload)  
2. Vincular fluxo e avançar status até **Pronto para assinatura**  
3. **Pedir assinatura** no detalhe  
4. Em Assinaturas: Autorizar gov.br → Assinar PKCS#7  
5. (Opcional) Lote + signatários para múltiplos documentos/pessoas  
6. Acompanhar em Notificações e Auditoria  

## Fora deste fechamento (evolução futura)

- Provedores adicionais (ICP-Brasil, Clicksign, etc.)  
- Envio SMTP real da fila `channel=email`  
- Assinatura envelopada em PDF (além do `.p7s` detached)  
- Integração automática bi-direcional com Propostas/Editais  

## Documentação por fase

- `docs/gestao-documental-fase-1.md`
- `docs/gestao-documental-fase-2.md`
- `docs/gestao-documental-fase-3.md`
- `docs/gestao-documental-fase-4-6.md`
