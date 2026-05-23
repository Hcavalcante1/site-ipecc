# Resumo — validação staging local (Bloco A + MVP + proposta_anexos)

Data: 2026-05-23 · Ambiente: `http://localhost:3002` · Branch: `master`

## Resultado geral

| Área | Status |
|------|--------|
| Bloco A (integridade anexos) | **Fechado** — 0 órfãos |
| Fase 3 upload (staging local) | **Fechado** |
| Migração `proposta_anexos` M1–M4 | **Fechada** em staging (flags testáveis) |
| Fase 2/3 código (clients + upload API) | **OK** |
| Build + CI local | **OK** (93 rotas; `ci.yml` + placeholders) |
| CI GitHub remoto | **Pendente** (sem `origin`) |
| Fase 1 Dashboard produção | **Pendente** (manual) |
| Prod prep documentado | `docs/PROD-PREP-CHECKLIST.md` |
| Hardening RLS (script) | `validar:seguranca` — **ação:** RLS SELECT em `propostas` para anon (ver `docs/sql/hardening-propostas-rls-anon.sql`) |

---

## Testes executados

### Comandos

- `npx tsc --noEmit` — OK
- `npm run build` — OK
- `npm run audit:anexos` — **0 órfãos** (19 propostas, 32 referências, 32 linhas `proposta_anexos`)
- `npm run validar:release-prep` — gate automatizado OK
- `npm run validar:pre-m4-corte` + `validar:m4-somente-tabela` — OK
- `npm run validate:upload-proposta` — upload + insert OK (2026-05-23: `1c5d4a89-…`, path `1779498524252-proposta-staging-validacao.pdf`)
- Browser `/propostas` — formulário multi-etapa e “Selecionar PDF” na habilitação jurídica OK

### HTTP (sem sessão admin)

| Rota | Status |
|------|--------|
| `GET /propostas` | 200 |
| `GET /admin/propostas` | 307 → login |
| `GET /api/download/propostas/{path}` | **401** |

### Browser

- `/editais`, `/projetos`, `/quem-somos` — OK (`supabasePublic`)
- `/propostas` — formulário OK; PDF no envio final: script ou upload manual
- `/admin/propostas` + detalhe + auditoria — OK com sessão admin
- Download admin — link visível na proposta staging

### Correções aplicadas (histórico)

1. `candidatosPathProposta` — paths `propostas/public/` (código)
2. Limpeza `arquivo_url` proposta teste órfã (dado)
3. Proposta staging `2fc42e0b-…` para validação upload/insert

---

## MVP enterprise (~80% local)

| # | Critério | Staging local |
|---|----------|---------------|
| 1 | Fase 1 Dashboard | Pendente produção |
| 2 | Zero órfãos | **OK** |
| 3 | Clients canônicos | **OK** |
| 4 | `audit:anexos` | **OK** |
| 5 | `tsc` + build | **OK**; CI no repo |

---

## Próximos passos (somente quando decidir publicar)

1. `git remote add` + `git push` → validar Actions
2. `docs/PROD-PREP-CHECKLIST.md` (Supabase prod + flags + smoke)
3. Smoke `/propostas` com PDF no browser de produção

## Produção (registro pós-go-live)

| Data | Responsável | Notas |
|------|-------------|-------|
| — | — | _Preencher após deploy autorizado_ |
