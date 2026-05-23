# Checklist equipe — release IPECC (1 página)

**Estágio atual:** MVP enterprise ~85% em **staging local** · **Produção congelada** até decisão explícita.

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
| CI no repositório | `.github/workflows/ci.yml` (dispara após primeiro push) |

---

## Antes do primeiro push

- [ ] Criar repositório remoto e `git remote add origin <URL>`
- [ ] `git push -u origin master`
- [ ] GitHub Actions → job **CI** verde (tsc + build)
- [ ] Confirmar variáveis no host de deploy (Supabase URL, anon, service role, Resend)

---

## Antes de abrir produção (Supabase + site)

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

- Modelo `proposta_anexos` (SQL)
- Signed URLs com TTL
- Performance / cache páginas públicas
- Pentest / DR (Fase 10)

---

## Contatos documentação

| Tema | Arquivo |
|------|---------|
| Plano geral | `docs/ROADMAP-ENTERPRISE.md` |
| Staging validado | `docs/STAGING-VALIDACAO-RESUMO.md` |
| Runbook operacional | `docs/runbook-staging-enterprise.md` |
| Editais admin (duas rotas) | `docs/FASE-5-EDITAIS-ROTAS.md` |
