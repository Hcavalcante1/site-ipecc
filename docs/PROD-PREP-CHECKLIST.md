# Prod prep — gate de release (somente após autorização explícita)

**Produção permanece congelada** até decisão da equipe. Este documento não autoriza deploy nem alterações no Supabase de produção.

## 0. Confirmar ambiente

```bash
npm run diag:supabase-env
```

- [ ] O `ref` exibido é o projeto **correto** (staging vs produção)
- [ ] `.env.local` / secrets do host **não** foram commitados

## 1. Código e CI (local ou GitHub)

```bash
npm run validar:release-prep
npm run ci:local
```

- [ ] `typecheck` + `audit:anexos` (0 órfãos) + `verify:proposta-anexos` + `validar:pre-m4-corte`
- [ ] `git push` → Actions **CI** verde (após configurar `origin`)

## 2. Supabase produção — segurança (manual)

Seguir **`docs/fase1-seguranca-supabase.md`** no projeto **produção**:

- [ ] Bucket `propostas` **privado** (sem SELECT público)
- [ ] RLS `propostas` — INSERT público controlado; SELECT/UPDATE/DELETE admin
- [ ] Rotacionar chaves se houve vazamento de `.env`

## 3. Tabela `proposta_anexos` (produção)

Ordem recomendada (staging já validou M1–M4):

1. [ ] Aplicar SQL: `docs/sql/proposta_anexos-M1-staging-APLICAR.sql` (adaptar para prod)
2. [ ] `npm run sync:proposta-anexos` (com `.env` apontando para **prod** — cuidado)
3. [ ] `npm run verify:proposta-anexos` + `npm run validar:pre-m4-corte` → 0 órfãos

## 4. Flags — rollout gradual (produção)

**Off por padrão no código.** Ativar no host (Vercel) em fases:

| Fase | Variáveis | Objetivo |
|------|-----------|----------|
| A | `USE_PROPOSTA_ANEXOS_TABLE` + `NEXT_PUBLIC_*` | Leitura híbrida |
| B | `USE_PROPOSTA_ANEXOS_ESCRITA` + `NEXT_PUBLIC_*` | Escrita dupla (público + admin) |
| C | `USE_PROPOSTA_ANEXOS_SOMENTE_TABELA` + `NEXT_PUBLIC_*` | Só após `validar:pre-m4-corte` e `validar:m4-somente-tabela` OK |

Detalhe: `docs/M4-PRE-CORTE-STAGING.md`, `docs/PLANO-MIGRACAO-PROPOSTA-ANEXOS.md`.

## 5. Variáveis no host de deploy

| Variável | Obrigatória |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (server) |
| `RESEND_API_KEY` | Sim |
| `EMAIL_CONTATO`, `EMAIL_ORCAMENTO`, `EMAIL_ADMIN` | Sim |
| Flags `USE_PROPOSTA_ANEXOS_*` | Conforme fase 4 |

Modelo: `.env.example`

## 6. Smoke pós-deploy

| # | Teste | Esperado |
|---|--------|----------|
| 1 | `GET /propostas` | 200 |
| 2 | Envio PDF teste | Insert + storage |
| 3 | `/admin/propostas` + download | OK com sessão |
| 4 | Download anônimo API propostas | **401** |
| 5 | `npm run audit:anexos` (env prod) | 0 órfãos |

## 7. Pós-go-live

- [ ] Registrar em `docs/STAGING-VALIDACAO-RESUMO.md` (seção produção)
- [ ] Remover propostas `*@example.com` de teste se desejado
- [ ] Equipe: duas rotas editais — `docs/FASE-5-EDITAIS-ROTAS.md`

## Rollback rápido

1. Desligar flags `USE_PROPOSTA_ANEXOS_*` no host
2. Colunas `*_url` permanecem — leitura legado volta automaticamente
3. Não executar DROP de colunas legado sem plano M4+ aprovado
