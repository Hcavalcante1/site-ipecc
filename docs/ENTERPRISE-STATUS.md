# Status enterprise — staging local

Atualizado: 2026-05-26 · HEAD `7899f94` · M1–M4 + público + WhatsApp + landing `/` + `/inicio`.

## Gates automatizados

```bash
npm run validar:push-prep       # rápido (código + WhatsApp scripts)
npm run guard:enterprise        # local (relatório em reports/)
npm run validar:enterprise      # completo (+ build)
npm run auditar:cms-staging     # conteúdo teste no Supabase
npm run validar:public-pages-padrao
npm run validar:publico
npm run validar:smoke-publico   # requer npm run dev
```

Agendamento Windows (08:00): `scripts/agendar-enterprise-guard.ps1` → tarefa `IPECC-Enterprise-Guard-Local`.

## Público / operação (BATCH 8–18)

| Item | Status |
|------|--------|
| `validar:publico` | OK |
| `validar:admin` | OK |
| Mobile 375px (BATCH 16) | OK (código) |
| Smoke 15 rotas (BATCH 15) | OK com dev |
| CMS limpeza (BATCH 17) | OK (`auditar:cms-staging` 0 suspeitos, 2026-05-26) |
| Landing `/` + editorial `/inicio` | OK (`validar:public-pages-padrao`, redirects `/portal`→`/inicio`, `/apresentacao`→`/`) |
| Pacote push | `docs/PUSH-PACKAGE-LOCAL.md` · push `ipecc-whatsapp-leads` + espelho `site-ipecc` |
| WhatsApp Fases 1–3 | Código OK; Meta sandbox pendente |

## Resultado atual (staging)

| Área | Status |
|------|--------|
| TypeScript + build | OK |
| `proposta_anexos` M1–M4 | OK (19 propostas, 32 refs, 0 órfãos) |
| CI workflow | OK (`site-ipecc` Actions run #3 em `7899f94`) |
| Upload público | OK (`validate:upload-proposta`) |
| Storage propostas privado | OK |
| **RLS `propostas` anon SELECT** | **OK** (após SQL + ajuste insert sem `.select()`) |
| Git remote | `origin` → `ipecc-whatsapp-leads` · `site-ipecc` espelhado |

## Bloqueador #1 — RLS — **resolvido em staging**

Se INSERT falhar de novo: `docs/sql/hardening-propostas-rls-PASSO5-grants-insert.sql`

Validar: `npm run validar:pos-hardening-rls`

Guia: `docs/HARDENING-RLS-APLICAR-STAGING.md`

## GitHub

Push realizado 2026-05-26 (`2a94f6d` site público, `7899f94` guard local). Guia: `docs/GITHUB-PUSH.md` · Guard local: `docs/ENTERPRISE-GUARD-LOCAL.md`

## Go-live produção

Somente após staging 100% + autorização: `docs/PROD-PREP-CHECKLIST.md`

## Scripts úteis

| Comando | Uso |
|---------|-----|
| `npm run audit:anexos` | CSV órfãos |
| `npm run sync:proposta-anexos` | Gap tabela vs legado |
| `npm run validar:m4-somente-tabela` | Smoke M4 |
| `npm run correlacionar:orfaos-logs` | Ops |

## Trilha pública (em andamento)

Padrões: `docs/PUBLICO-PADROES.md` · componentes em `components/public/`

## Commits recentes (trilha)

`7899f94` guard local · `2a94f6d` landing `/` + `/inicio` + SEO · `cfd0f19` `.cursorignore`
