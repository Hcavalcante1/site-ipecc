# IPECC — Site público + admin

Next.js 14 · Supabase · Staging validado localmente (enterprise gate).

## Desenvolvimento

```bash
cp .env.example .env.local   # preencher chaves
npm install
npm run dev
```

## Validação (staging)

```bash
npm run validar:enterprise
npm run validar:pos-hardening-rls
```

## Documentação

| Tema | Arquivo |
|------|---------|
| Status e bloqueadores | `docs/ENTERPRISE-STATUS.md` |
| Runbook operacional | `docs/runbook-staging-enterprise.md` |
| Go-live produção | `docs/PROD-PREP-CHECKLIST.md` |
| Migração anexos | `docs/PLANO-MIGRACAO-PROPOSTA-ANEXOS.md` |
| Push GitHub | `docs/GITHUB-PUSH.md` |

Produção e deploy permanecem **congelados** até decisão explícita da equipe.
