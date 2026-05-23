# Resumo — validação staging local (Bloco A + MVP)

Data: 2026-05-23 · Ambiente: `http://localhost:3002` · Branch: `master`

## Resultado geral

| Área | Status |
|------|--------|
| Bloco A (integridade anexos) | **Fechado** em staging local (0 órfãos) |
| Fase 2/3 código (clients + upload API) | **OK** |
| Build produção | **OK** (91 rotas) |
| CI GitHub | Workflow commitado; **push/remote pendente** (sem `origin` configurado) |
| Fase 1 Dashboard produção | **Pendente** (manual) |

---

## Testes executados

### Comandos

- `npx tsc --noEmit` — OK
- `npm run build` — OK
- `npm run audit:anexos` — **0 órfãos** (9 propostas, 20 referências)
- `npm run validate:upload-proposta` — upload + insert OK

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

## Próximos passos (produção)

1. `git remote add` + `git push` → validar Actions
2. `docs/fase1-seguranca-supabase.md` no projeto Supabase de produção
3. Smoke `/propostas` com PDF real no browser de produção
