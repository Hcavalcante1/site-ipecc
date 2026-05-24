# Status enterprise — staging local

Atualizado: trilha M1–M4 + CI + admin + ops + prod prep + hardening (código).

## Gates automatizados

```bash
npm run validar:enterprise    # consolidado
npm run validar:release-prep    # release prep
npm run validar:seguranca       # RLS + storage
```

## Resultado atual (staging)

| Área | Status |
|------|--------|
| TypeScript + build | OK |
| `proposta_anexos` M1–M4 | OK (19 propostas, 32 refs, 0 órfãos) |
| CI workflow | OK local; push pendente |
| Upload público | OK (`validate:upload-proposta`) |
| Storage propostas privado | OK |
| **RLS `propostas` anon SELECT** | **PENDENTE** — aplicar SQL |
| Git remote | Pendente |

## Bloqueador #1 — RLS (5 min)

1. Supabase **staging** → SQL Editor
2. Executar `docs/sql/hardening-propostas-rls-APLICAR.sql`
3. `npm run validar:pos-hardening-rls`

Guia: `docs/HARDENING-RLS-APLICAR-STAGING.md`

## Bloqueador #2 — GitHub (quando autorizar)

```powershell
git remote add origin https://github.com/SEU_USUARIO/ipecc-public-site.git
git push -u origin master
```

Checklist: `docs/CHECKLIST-EQUIPE-RELEASE.md`

## Go-live produção

Somente após staging 100% + autorização: `docs/PROD-PREP-CHECKLIST.md`

## Scripts úteis

| Comando | Uso |
|---------|-----|
| `npm run audit:anexos` | CSV órfãos |
| `npm run sync:proposta-anexos` | Gap tabela vs legado |
| `npm run validar:m4-somente-tabela` | Smoke M4 |
| `npm run correlacionar:orfaos-logs` | Ops |

## Commits recentes (trilha)

`b68011b` RLS SQL · `417e5c3` hardening · `6f4b46f` prod prep · `86b5871` M4 · `2a6e9e5` CI
