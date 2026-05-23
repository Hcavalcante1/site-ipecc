# Resumo — validação staging local (Bloco A + MVP)

Data: 2026-05-23 · Ambiente: `http://localhost:3002` · Branch: `master`

## Resultado geral

| Área | Status |
|------|--------|
| Bloco A (integridade anexos) | **Fechado** em staging local (0 órfãos) |
| Fase 3 upload (staging local) | **Fechado** — script + HTTP 401; browser UI OK |
| Fase 2/3 código (clients + upload API) | **OK** |
| Build produção | **OK** (93 rotas) |
| CI GitHub | Workflow OK localmente; **push pendente** (sem `origin`) |
| Fase 1 Dashboard produção | **Pendente** (manual) |

---

## Testes executados

### Comandos

- `npx tsc --noEmit` — OK
- `npm run build` — OK
- `npm run audit:anexos` — **0 órfãos** (9 propostas, 20 referências)
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
2. `docs/fase1-seguranca-supabase.md` no Supabase de **produção**
3. Smoke `/propostas` com PDF no browser de produção

**Agora (local):** opcional — login admin e download da proposta `1c5d4a89-8f8b-460a-a4fb-0cdf0c50502a`.
