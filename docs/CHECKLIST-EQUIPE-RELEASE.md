# Checklist equipe — release IPECC (1 página)

**Estágio atual:** MVP enterprise ~90% em **staging local** · Migração `proposta_anexos` M1–M4 validada · **Produção congelada**

---

## O que já está pronto (não repetir em prod sem runbook)

| Item | Evidência |
|------|-----------|
| Download propostas só admin | `/api/download` → 401 anônimo |
| Admin protegido | `/admin/*` → login |
| Integridade anexos | `npm run audit:anexos` → 0 órfãos |
| Upload propostas (staging) | `npm run validate:upload-proposta` |
| Build + TypeScript | `npx tsc --noEmit` + `npm run build` |
| Clients Supabase padronizados | `docs/SUPABASE-CLIENTS.md` |
| Migração `proposta_anexos` M1–M4 (staging) | `validar:release-prep`, `PLANO-MIGRACAO-PROPOSTA-ANEXOS.md` |
| CI no repositório | `.github/workflows/ci.yml` — `npm run typecheck` + build (placeholders env) |

---

## Antes do primeiro push

1. Criar repositório vazio no GitHub (privado recomendado)
2. Configurar remote e enviar:

```powershell
git remote add origin https://github.com/SEU_USUARIO/ipecc-public-site.git
git push -u origin master
```

3. GitHub → Actions → job **CI** verde
4. Secrets reais ficam no host de deploy (Vercel/etc.), não no Actions (build usa placeholders)

---

## Antes de abrir produção (Supabase + site)

**Runbook completo:** `docs/PROD-PREP-CHECKLIST.md`

- [ ] `npm run validar:release-prep` com `.env` apontando para o projeto **correto**
- [ ] Executar `docs/fase1-seguranca-supabase.md` no projeto **produção**
- [ ] Bucket `propostas` **privado**; sem SELECT público
- [ ] Políticas INSERT (storage + tabela `propostas`) para envio público
- [ ] `npm run audit:anexos` apontando para prod (com cuidado) ou UI `/admin/propostas/auditoria`
- [ ] Smoke: `GET /propostas` → enviar PDF teste → admin lista → download admin
- [ ] Download anônimo → **401/403**
- [ ] Rotacionar chaves se `.env` vazou

---

## Após deploy

- [ ] Registrar data e responsável em `docs/STAGING-VALIDACAO-RESUMO.md` (seção produção)
- [ ] Remover propostas de teste (`staging-validacao-*@example.com`) se desejado
- [ ] Comunicar equipe: duas áreas admin de editais (`/admin/editais` vs `/admin/paginas/editais`)

---

## Fora do escopo desta release (backlog)

- Signed URLs com TTL
- Performance / cache páginas públicas
- Pentest / DR (Fase 10)

---

## Contatos documentação

| Tema | Arquivo |
|------|---------|
| Plano geral | `docs/ROADMAP-ENTERPRISE.md` |
| **Status atual / bloqueadores** | `docs/ENTERPRISE-STATUS.md` |
| **Prod prep / go-live** | `docs/PROD-PREP-CHECKLIST.md` |
| Staging validado | `docs/STAGING-VALIDACAO-RESUMO.md` |
| Runbook operacional | `docs/runbook-staging-enterprise.md` |
| Hardening RLS | `docs/HARDENING-RLS-CHECKLIST.md` · `npm run validar:seguranca` |
